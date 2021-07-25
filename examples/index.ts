import * as auth from '../src'

// Get auth data
const res = auth.getAccountAuthData({
	email: 'example@somemail.com',
	password: 'somepassword123',
})
res.then(async ({ connectSID, habrSessionID, acc_csid, PHPSESSID, hsec_id }) => {
	console.log('connectSID', connectSID)
	console.log('habrSessionID', habrSessionID)
	console.log('acc_csid', acc_csid)
	console.log('PHPSESSID', PHPSESSID)
	console.log('hsec_id', hsec_id)

	// Get csrf-token
	const csrfToken = await auth.getCSRFToken({
		connectSID,
		habrSessionID,
		acc_csid,
		PHPSESSID,
		hsec_id,
	})
	console.log(csrfToken)
})

export default auth
