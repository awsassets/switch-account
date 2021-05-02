
const denodify = function (fn) {
	return function () {
		let args = Array.prototype.slice.call(arguments);
		return new Promise(function (fulfill) {
			fn.apply(null, args.concat([fulfill]));
		});
	};
};

const hostToDomain = function (host) {
	let a = host.split('.');
	if (a.length > 2)
		a = a.slice(a.length - 2);
	return a.join('.');
};

const cookieUrl = function (c) {
	return (c.secure ? 'https' : 'http') + '://' + c.domain.replace(/^\./, '');
};

const getAllCookiesByDomain = function (domain) {
	return denodify(chrome.cookies.getAll)({ domain: domain });
};

const removeAllCookiesByDomain = function (domain) {
	return getAllCookiesByDomain(domain).then(function (cookies) {
		return removeAllCookies(cookies).then(function (res) {
			console.log('removeRes', domain, res);
		});
	});
};

const removeAllCookies = function (cookies) {
	return Promise.all(cookies.map(function (c) {
		return denodify(chrome.cookies.remove)({
			url: cookieUrl(c),
			name: c.name,
			storeId: c.storeId,
		});
	}));
};

const setAllCookies = function (cookies) {
	return Promise.all(cookies.map(function (c) {
		const set = {
			url: cookieUrl(c),
			name: c.name, value: c.value,
			domain: c.domain, path: c.path,
			secure: c.secure, httpOnly: c.httpOnly,
			expirationDate: c.expirationDate, storeId: c.storeId,
		};
		return denodify(chrome.cookies.set)(set);
	}));
};

const removeAndSetCookies = function (domain, cookies) {
	return removeAllCookiesByDomain(domain).then(function () {
		return setAllCookies(cookies);
	});
};

const storageGet = function (k, v) {
	var storage = chrome.storage.local;
	return denodify(storage.get.bind(storage))(k).then(function (res) {
		return res[k] || v;
	});
};

const storageSet = function (k, v) {
	const storage = chrome.storage.local;
	const p = {};
	p[k] = v;
	return denodify(storage.set.bind(storage))(p);
};

const defaultDomainData = function () {
	return { profiles: { 1: { title: '默认' } }, currentProfileId: 1 };
};

const api = {};

api.deleteCurrentProfile = function (params) {
	const domain = hostToDomain(params.host);
	return storageGet(domain).then(function (data) {
		if (data == null)
			return;
		if (Object.keys(data.profiles).length <= 1)
			return;
		delete data.profiles[data.currentProfileId];
		data.currentProfileId = Object.keys(data.profiles)[0];
		return storageSet(domain, data).then(function () {
			return removeAndSetCookies(domain, data.profiles[data.currentProfileId].cookies);
		});
	});
};

api.newProfile = function (params) {
	const domain = hostToDomain(params.host);
	console.log('newProfile: ', domain);
	return storageGet(domain).then(function (data) {
		if (data == null)
			data = defaultDomainData();

		const oldProfile = data.profiles[data.currentProfileId];
		return getAllCookiesByDomain(domain)
			.then(function (cookies) {
				oldProfile.cookies = cookies;

				const newProfile = { title: '马甲' + Object.keys(data.profiles).length };
				const newProfileId = Date.now();
				data.profiles[newProfileId] = newProfile;
				data.currentProfileId = newProfileId;
			}).then(function () {
				return removeAllCookiesByDomain(domain);
			}).then(function () {
				console.log('storageSet: ', domain, data);
				return storageSet(domain, data);
			});
	});
};

api.updateProfile = function (params) {
	const domain = hostToDomain(params.host);
	return storageGet(domain).then(function (data) {
		if (data == null)
			return;
		var id = params.id || data.currentProfileId;
		var profile = data.profiles[id];
		if (profile == null)
			return;
		for (var k in params.$set || {}) {
			var v = params.$set[k];
			profile[k] = v;
		}

		return storageSet(domain, data);
	});
};

api.selectProfile = function (params) {
	const domain = hostToDomain(params.host);
	return storageGet(domain).then(function (data) {
		if (data == null)
			return;
		if (params.id == data.currentProfileId)
			return;

		let oldProfile = data.profiles[data.currentProfileId];
		let newProfile = data.profiles[params.id];
		if (oldProfile == null || newProfile == null)
			return;

		return getAllCookiesByDomain(domain).then(function (cookies) {
			oldProfile.cookies = cookies;
			data.currentProfileId = params.id;
			return storageSet(domain, data);
		}).then(function () {
			return removeAndSetCookies(domain, newProfile.cookies || []);
		});
	});
};

api.getProfiles = function (params) {
	const domain = hostToDomain(params.host);
	return storageGet(domain).then(function (data) {
		if (data == null)
			return defaultDomainData();
		return data;
	});
};

api.updateUserInfo = function (params) {
	const domain = hostToDomain(params.host);
	return storageGet(domain).then(function (data) {
		if (data == null)
			data = defaultDomainData();
		const profile = data.profiles[data.currentProfileId];
		profile.title = params.username;
		return storageSet(domain, data);
	});
};

chrome.runtime.onMessage.addListener(function (msg, sender, cb) {
	const fulfill = function (res) {
		console.log(msg, res);
		cb(res);
	};

	const func = api[msg.op];
	if (func)
		func(msg.params).then(fulfill);

	return true;
});

