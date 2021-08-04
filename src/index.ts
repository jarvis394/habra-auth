/**
 * 1. https://habr.com/kek/v1/auth/habrahabr/?back=/ru/all/&hl=ru
 * 		- Set-Cookie: habr_web_redirect_back, connect_sid
 * 		- Request cookies: none
 * 2. (Redirect) https://habr.com/ru/auth/o/login/?response_type=code
 * 		&redirect_uri=https://habr.com/kek/v1/auth/habrahabr/callback?hl=ru
 * 		&state=eak9xFRlk0V226ONZSaLuvMV
 * 		&client_id=45b151dad545995.06192751
 * 		- Request cookies: habr_web_redirect_back, connect_sid
 * 3. (Redirect) https://habr.com/ru/auth/login/
 * 		?back_link=https://habr.com/ru/auth/o/login/?response_type=code&redirect_uri=https%3A%2F%2Fhabr.com%2Fkek%2Fv1%2Fauth%2Fhabrahabr%2Fcallback%3Fhl%3Dru&state=eak9xFRlk0V226ONZSaLuvMV&client_id=45b151dad545995.06192751
 * 		- Request cookies: habr_web_redirect_back, connect_sid
 * 		- Set-Cookie: habrsession_id, fl, hl
 * 4. (Redirected) https://account.habr.com/login/?state=beed638a48850d6ea00409ae1b13adbe&consumer=habr&hl=ru_RU
 * 		- Request cookies: acc_csid, hl
 * 5.1. https://account.habr.com/ajax/validate/email/
 * 5.2. https://account.habr.com/ajax/login/
 * 		- Set-Cookie: acc_sess_id
 * 		- Request cookies: acc_csid, hl
 * 6. (From code) https://habr.com/ac/entrance/
 * 		?token=abcdefghijklmnopqrstuvwxyz123456
 * 		&state=abcdefghijklmnopqrstuvwxyz123456
 * 		&time=1627153823
 * 		&sign=abcdefghijklmnopqrstuvwxyz123456
 * 		&utm_nooverride=1
 * 		- Request cookies: connect_sid, habrsession_id, hl, fl, habr_web_redirect_back
 * 		- Set-Cookie: PHPSESSID, hsec_id, (hl, fl)
 * 7. (Redirect) https://habr.com/ru/auth/o/login/
 * 		?response_type=code
 * 		&redirect_uri=https://habr.com/kek/v1/auth/habrahabr/callback?hl=ru
 * 		&state=eak9xFRlk0V226ONZSaLuvMV
 * 		&client_id=45b151dad545995.06192751
 * 		- Request cookies: connect_sid, habrsession_id, PHPSESSID, hsec_id, (hl, fl, habr_web_redirect_back)
 * 8. (Redirect) https://habr.com/kek/v1/auth/habrahabr/callback
 * 		?code=abcdefghijklmnopqrstuvwxyz123456
 * 		&state=eak9xFRlk0V226ONZSaLuvMV
 * 		&hl=ru
 * 		- Request cookies: connect_sid, habrsession_id, PHPSESSID, hsec_id, (hl, fl, habr_web_redirect_back)
 * 		- Set-Cookie: connect_sid, habr_web_user_id, habr_web_hide_ads, habr_web_ga_uid
 * 9. Done (to the main page)
 */

import cheerio from 'cheerio'
import fetch from 'node-fetch'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import setCookieParser from 'set-cookie-parser'

export const CLIENT_ID = '85cab69095196f3.89453480'
export const CLIENT_SECRET = '41ce71d623e04eab2cb8c00cf36bc14ec3aaf6d3'

export interface TokenResponse {
	access_token?: string
	serve_time?: string
	error?: boolean
	code?: number
	message?: string
}

/**
 * Get account auth data for authorized requests
 */
export const getAccountAuthData = async ({ email, password }: { email: string; password: string }) => {
	// 1
	const authStart = await axios({
		maxRedirects: 0,
		url: 'https://habr.com/kek/v1/auth/habrahabr/?back=/ru/all/&hl=ru',
		method: 'GET',
		validateStatus: () => true,
		withCredentials: true,
	})
	const cookies = setCookieParser(authStart.headers['set-cookie'])
	const connectSIDObject = cookies.find((e) => e.name === 'connect_sid')

	if (!connectSIDObject) return { error: true, message: '(1) No connect_sid in response cookies:' }
	const connectSID = encodeURIComponent(connectSIDObject.value)
	const authStartRedirectURL = authStart.headers.location

	// 2
	const authOLogin = await axios({
		method: 'GET',
		withCredentials: true,
		validateStatus: () => true,
		url: authStartRedirectURL,
		maxRedirects: 0,
	})
	const authLoginLocation = authOLogin.headers.location
	// 3
	const authLogin = await axios({
		method: 'GET',
		withCredentials: true,
		validateStatus: () => true,
		url: authLoginLocation,
		maxRedirects: 0,
	})
	const authLoginCookies = setCookieParser(authLogin.headers['set-cookie'])
	if (!authLoginCookies) return { error: true, message: '(3) No habr_session_id in response cookies' }

	const habrSessionID = authLoginCookies.find((e) => e.name === 'habrsession_id').value

	// 4
	const accountHabr = await axios({
		method: 'GET',
		withCredentials: true,
		validateStatus: () => true,
		url: authLogin.headers.location,
		maxRedirects: 0,
	})
	const accountHabrCookies = setCookieParser(accountHabr.headers['set-cookie'])
	const acc_csid = accountHabrCookies.find((e) => e.name === 'acc_csid').value
	const accountHabrPathname = accountHabr.request.path
	const accountHabrURL = new URL('https://account.habr.com' + accountHabrPathname)
	const accountHabrQuery = new URLSearchParams(accountHabrURL.search.slice(1))
	const accountHabrState = accountHabrQuery.get('state')

	// 5
	const authFormData = new URLSearchParams()
	authFormData.append('state', accountHabrState)
	authFormData.append('consumer', 'habr')
	authFormData.append('email', email)
	authFormData.append('password', password)
	authFormData.append('captcha', '')
	authFormData.append('g-recaptcha-response', '')
	authFormData.append('captcha_type', 'recaptcha')

	const authResponse = await axios({
		method: 'POST',
		withCredentials: true,
		url: 'https://account.habr.com/ajax/login/',
		validateStatus: () => true,
		data: authFormData.toString(),
		headers: {
			Referer: `https://account.habr.com/login/?state=${accountHabrState}&consumer=habr&hl=ru_RU`,
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			Cookie: `connect_sid=${connectSID}; habrsession_id=${habrSessionID}; fl=ru; hl=ru; acc_csid=${acc_csid};`,
			Origin: 'https://account.habr.com',
			Host: 'account.habr.com',
			Accept: 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
		},
	})
	const redirectAuthURLMatch = /window\.location\.href = '(.*)'/g.exec(authResponse.data)

	if (
		!redirectAuthURLMatch &&
		authResponse.data.includes('Пользователь с такой электронной почтой или паролем не найден')
	) {
		return { error: true, message: 'Authentication failed', isAuthError: true }
	} else if (!redirectAuthURLMatch && authResponse.data.includes('Необходимо разгадать капчу')) {
		return { error: true, message: 'Captcha error', isCaptchaError: true }
	} else if (!redirectAuthURLMatch) {
		return { error: true, message: 'Unknown authentication error', response: authResponse, isUnknownAuthError: true }
	}
	const redirectAuthURL = redirectAuthURLMatch[1]

	// 6
	const accountEntrance = await axios({
		method: 'GET',
		withCredentials: true,
		validateStatus: () => true,
		url: redirectAuthURL,
		maxRedirects: 0,
		headers: {
			Host: 'habr.com',
			Referer: 'https://account.habr.com/',
			Cookie: `connect_sid=${connectSID}; habrsession_id=${habrSessionID}; fl=ru; hl=ru; acc_csid=${acc_csid}; habr_web_redirect_back=%2Fru%2Fall%2F;`,
		},
	})
	const accountEntranceRedirectURL = accountEntrance.headers.location
	const accountEntranceCookies = setCookieParser(accountEntrance.headers['set-cookie'])
	const PHPSESSID = accountEntranceCookies.find((e) => e.name === 'PHPSESSID').value
	const hsec_id = accountEntranceCookies.find((e) => e.name === 'hsec_id').value

	// 7
	const authOLoginFromEntrance = await axios({
		withCredentials: true,
		validateStatus: () => true,
		method: 'GET',
		url: accountEntranceRedirectURL,
		maxRedirects: 0,
		headers: {
			Host: 'habr.com',
			Referer: 'https://account.habr.com/',
			Cookie: `connect_sid=${connectSID}; habrsession_id=${habrSessionID}; fl=ru; hl=ru; acc_csid=${acc_csid}; habr_web_redirect_back=%2Fru%2Fall%2F; PHPSESSID=${PHPSESSID}; hsec_id=${hsec_id}`,
		},
	})
	const authOLoginFromEntranceRedirectURL = authOLoginFromEntrance.headers.location

	// 8
	await axios({
		withCredentials: true,
		validateStatus: () => true,
		method: 'GET',
		url: authOLoginFromEntranceRedirectURL,
		headers: {
			Host: 'habr.com',
			Referer: 'https://account.habr.com/',
			Cookie: `connect_sid=${connectSID}; habrsession_id=${habrSessionID}; fl=ru; hl=ru; acc_csid=${acc_csid}; habr_web_redirect_back=%2Fru%2Fall%2F; PHPSESSID=${PHPSESSID}; hsec_id=${hsec_id}`,
		},
		maxRedirects: 0,
	})

	return { connectSID, habrSessionID, acc_csid, PHPSESSID, hsec_id }
}

export const makeRequest = async <T = unknown>({
	connectSID,
	csrfToken,
	method,
	version = 2,
	requestParams,
}: {
	connectSID: string
	csrfToken?: string
	method: string
	version?: 1 | 2
	requestParams: Partial<AxiosRequestConfig>
}): Promise<AxiosResponse<T>> => {
	const headers = {
		Cookie: `connect_sid=${connectSID}`,
	}
	if (csrfToken) headers['csrf-token'] = csrfToken

	const res = await axios({
		method: requestParams?.method || 'GET',
		url: `https://habr.com/kek/v${version}/${method}`,
		validateStatus: () => true,
		params: {
			...requestParams.params,
			fl: 'ru',
			hl: 'ru',
		},
		headers: {
			...requestParams.headers,
			...headers,
		},
		...requestParams,
	})
	return res
}

/**
 * Get token for an old Habr API
 */
export const getToken = async ({
	email,
	password,
	fetch: customFetch,
}: {
	email: string
	password: string
	fetch?: any
}): Promise<TokenResponse> => {
	const params = new URLSearchParams()
	params.append('email', email)
	params.append('password', password)
	params.append('client_id', CLIENT_ID)
	params.append('client_secret', CLIENT_SECRET)
	params.append('grant_type', 'password')

	const res = await (customFetch || fetch)('https://habr.com/auth/o/access-token', {
		method: 'post',
		body: params,
	})
	const data = await res.json()

	if (res.status === 400) {
		return { error: true, code: res.status, message: res.statusText }
	} else return data
}

/**
 * Get csrf-token for authorized requests
 */
export const getCSRFToken = async ({ connectSID, habrSessionID, acc_csid, PHPSESSID, hsec_id }) => {
	try {
		const response = await axios.get('https://m.habr.com/', {
			headers: {
				Cookie: `connect_sid=${connectSID}; habrsession_id=${habrSessionID}; fl=ru; hl=ru; acc_csid=${acc_csid}; habr_web_redirect_back=%2Fru%2Fall%2F; PHPSESSID=${PHPSESSID}; hsec_id=${hsec_id}`,
			},
		})
		const html = response.data
		const $ = cheerio.load(html)
		const csrfToken = $('meta[name="csrf-token"]')

		return csrfToken.attr('content')
	} catch (e) {
		return { error: true, ...e }
	}
}
