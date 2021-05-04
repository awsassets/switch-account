
!function () {
	const callApi = function (op, params) {
		return new Promise(function (fulfill) {
			params = params || {};
			params.host = window.location.hostname;
			chrome.runtime.sendMessage(null, { op: op, params: params }, {}, fulfill);
		});
	};

	const gotUsername = function (name) {
		if (localStorage.getItem('majia.username') === name)
			return;
		localStorage.setItem('majia.username', name);
		callApi('updateUserInfo', { username: name });
	};

	const hostToDomain = function (host) {
		var a = host.split('.');
		if (a.length > 2)
			a = a.slice(a.length - 2);
		return a.join('.');
	};

	({
		'douban.com': function () {
			const span = document.querySelector('.nav-user-account span');
			if (span) {
				const m = span.innerHTML.match(new RegExp('(.*)的帐号'));
				m && m[1] && gotUsername(m[1]);
			}
		},

		'zhihu.com': function () {
			const span = document.querySelector('.ProfileHeader-title .ProfileHeader-name');
			if (span && span.innerHTML) {
				gotUsername(span.innerHTML);
			}

		},

		'weibo.com': function () {
			const em = document.querySelector('[nm="name"] .S_txt1');
			if (em && em.innerHTML) {
				gotUsername(em.innerHTML);
				return;
			}
			const m = document.cookie.match(/un=([^;]+);/);
			m && m[1] && gotUsername(m[1]);
		},

		'twitter.com': function () {
			const span = document.querySelector('.DashboardProfileCard-screennameLink span');
			if (span && span.innerHTML)
				gotUsername(span.innerHTML);
		},

		'facebook.com': function () {
			const span = document.querySelector('[data-click="profile_icon"] span');
			if (span && span.innerHTML)
				gotUsername(span.innerHTML);
		},

	}[hostToDomain(window.location.hostname)] || function () { })();
	console.log('content script started');
	console.log('domain: ', hostToDomain(window.location.hostname));
}();



