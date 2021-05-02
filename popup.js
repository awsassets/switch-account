
const reloadCurrentTab = function () {
	chrome.tabs.query({ 'active': true }, function (tabs) {
		chrome.tabs.reload(tabs[0].id);
	});
};

const reloadPopup = function () {
	window.location.reload();
};

const callApi = function (op, params) {
	return new Promise(function (fulfill) {
		params = params || {};

		chrome.tabs.query({ 'active': true }, function (tabs) {
			var urlParseRE = /^(((([^:\/#\?]+:)?(?:(\/\/)((?:(([^:@\/#\?]+)(?:\:([^:@\/#\?]+))?)@)?(([^:\/#\?\]\[]+|\[[^\/\]@#?]+\])(?:\:([0-9]+))?))?)?)?((\/?(?:[^\/\?#]+\/+)*)([^\?#]*)))?(\?[^#]+)?)(#.*)?/;
			var matches = urlParseRE.exec(tabs[0].url);
			params.host = matches[11];
			chrome.runtime.sendMessage(null, { op: op, params: params }, {}, fulfill);
		});
	});
};

const selectProfile = function (id) {
	callApi('selectProfile', { id: id }).then(function () {
		reloadCurrentTab();
		reloadPopup();
	});
};

const newProfile = function () {
	callApi('newProfile').then(function () {
		reloadCurrentTab();
		reloadPopup();
	});
};

const deleteCurrentProfile = function () {
	callApi('deleteCurrentProfile').then(function () {
		reloadCurrentTab();
		reloadPopup();
	});
};

const updateProfile = function (id, set) {
	callApi('updateProfile', { id: id, $set: set }).then(function () {
		reloadPopup();
	});
};

document.addEventListener('DOMContentLoaded', function () {
	// 获取当前tab页网站的会话信息
	callApi('getProfiles').then(function (data) {
		let profiles = [];
		for (let id in data.profiles) {
			let profile = data.profiles[id];
			profile.id = id;
			profiles.push(profile);
		}
		profiles.sort((a, b) => {
			return a.id - b.id;
		})


		let accountDiv = document.getElementsByClassName('account-list')[0];
		let toolDiv = document.getElementsByClassName('tool-list')[0];

		profiles.forEach((profile) => {
			let title = profile.title;

			const button = document.createElement('button');
			const userDiv = document.createElement('span');
			const textDiv = document.createElement('span');

			userDiv.className = "glyphicon glyphicon-user";

			button.type = 'button';
			button.className = 'btn btn-info button btn-xs';
			textDiv.innerHTML = title;

			if (profile.id == data.currentProfileId) {
				button.className = 'btn btn-success button btn-xs disabled';
				textDiv.innerHTML = '当前账户：' + title;
			}

			button.appendChild(userDiv);
			button.appendChild(textDiv);

			if (profile.id != data.currentProfileId) {
				button.onclick = function () {
					selectProfile(profile.id);
				};
			}

			accountDiv.appendChild(button);
		});

		let button = document.createElement('button');
		button.innerHTML = '新建..';
		button.type = 'button';
		button.className = 'btn btn-primary button btn-xs';
		button.onclick = newProfile;
		toolDiv.appendChild(button);

		if (profiles.length > 1) {
			let button = document.createElement('button');
			let input = document.createElement('input');
			input.value = data.profiles[data.currentProfileId].title;

			button.innerHTML = '重命名';
			button.type = 'button';
			button.className = 'btn btn-primary button btn-xs';
			button.onclick = function () {
				button.parentNode.replaceChild(input, button);
				input.focus();
				input.onkeypress = function (e) {
					if (e.keyCode == 13) {
						updateProfile(data.currentProfileId, {
							title: input.value,
						});
						return false;
					}
					return true;
				};
			};
			toolDiv.appendChild(button);

			button = document.createElement('button');
			button.innerHTML = '删除';
			button.type = 'button';
			button.className = 'btn btn-danger button btn-xs';
			button.onclick = deleteCurrentProfile;
			toolDiv.appendChild(button);
		}

	});
});

