import * as auth from '../src'

const authData = {
	connectSID: '',
	habrSessionID: '',
	acc_csid: '',
	PHPSESSID: '',
	hsec_id: '',
}
const csrfToken = ''
const res = auth.makeRequest<unknown>({
	connectSID: authData.connectSID,
	csrfToken,
	method: 'posts/all',
	requestParams: {
		params: {
			page: '1',
			sort: 'rating',
		},
	},
	version: 2,
})
res.then((response) => {
	console.log(response.data)
})

export default auth
