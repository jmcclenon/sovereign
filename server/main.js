import { onPageLoad } from 'meteor/server-render';
import { Meteor } from 'meteor/meteor';
import { meta, urlDoctor, toTitleCase } from '/imports/startup/both/routes';
import { TAPi18n } from 'meteor/tap:i18n';

import { Contracts } from '/imports/api/contracts/Contracts';
import { log } from '/lib/const';

import '/imports/startup/server';
import '/imports/startup/both';

Meteor.startup(() => {
  // Mail server settings
  process.env.MAIL_URL = Meteor.settings.private.smtpServer;
});

const _fixDBUrl = (url) => {
  if (url.first() === '/') {
    return url.substring(1);
  }
  return url;
};

const _stripHTML = (html) => {
  let str = html;
  str = str.replace(/<\s*br\/*>/gi, '');
  str = str.replace(/<\s*a.*href="(.*?)".*>(.*?)<\/a>/gi, ' $2 (Link->$1) ');
  str = str.replace(/<\s*\/*.+?>/ig, '');
  str = str.replace(/ {2,}/gi, '');
  str = str.replace(/\n+\s*/gi, '');
  return str;
};

const _parseURL = (url) => {
  if (url.substring(0, 4) === 'http') {
    // absolute
    return url;
  }
  // relative
  return `${urlDoctor(Meteor.absoluteUrl.defaultOptions.rootUrl)}${_fixDBUrl(url)}`;
};

/**
* @summary server side rendering of html
* @param {function} sink class with http request info
*/
onPageLoad(function (sink) {
  let url = sink.request.url.path;
  if (url.charAt(0) === '/') {
    url = url.substring(1);
  }
  const path = url.split('/');

  let tags = { title: '', description: '', image: '' };
  let user;
  let contract;
  let country;
  let username;

  switch (path[0]) {
    case 'vote':
      contract = Contracts.findOne({ keyword: path[1] });
      if (contract) {
        if (contract.ballotEnabled) {
          tags.title = `${TAPi18n.__('vote-tag-ballot-title').replace('{{collective}}', Meteor.settings.public.Collective.name)}`;
        } else {
          tags.title = `${TAPi18n.__('vote-tag-title').replace('{{collective}}', Meteor.settings.public.Collective.name)}`;
        }
        tags.description = _stripHTML(contract.title);
        tags.image = `${urlDoctor(Meteor.absoluteUrl.defaultOptions.rootUrl)}${_fixDBUrl(Meteor.settings.public.Collective.profile.logo)}`;
      } else {
        tags.title = `${Meteor.settings.public.Collective.name} - ${Meteor.settings.public.Collective.profile.bio}`;
        tags.description = Meteor.settings.public.Collective.profile.bio;
        tags.image = _parseURL(Meteor.settings.public.Collective.profile.logo);
      }
      break;
    case 'peer':
      user = Meteor.users.findOne({ username: path[1] });
      username = `@${path[1]}`;
      if (user.profile.firstName) {
        username = `${user.profile.firstName}`;
        if (user.profile.lastName) {
          username += ` ${user.profile.lastName}`;
        }
      }
      tags.title = `${TAPi18n.__('profile-tag-title').replace('{{user}}', `${username}`).replace('{{collective}}', Meteor.settings.public.Collective.name)}`;
      tags.description = `${TAPi18n.__('profile-tag-description').replace('{{user}}', `@${path[1]}`).replace('{{collective}}', Meteor.settings.public.Collective.name)}`;
      if (user) {
        tags.image = _parseURL(user.profile.picture);
      } else {
        tags.image = _parseURL(Meteor.settings.public.Collective.profile.logo);
      }
      break;
    case 'tag':
    case 'token':
      tags.title = `${TAPi18n.__('hashtag-tag-title').replace('{{hashtag}}', path[1]).replace('{{collective}}', Meteor.settings.public.Collective.name)}`;
      tags.description = `${TAPi18n.__('hashtag-tag-description').replace('{{hashtag}}', path[1]).replace('{{collective}}', Meteor.settings.public.Collective.name)}`;
      tags.image = _parseURL(Meteor.settings.public.Collective.profile.logo);
      break;
    case 'geo':
      country = toTitleCase(path[1]);
      tags.title = `${TAPi18n.__('country-tag-title').replace('{{country}}', country).replace('{{collective}}', Meteor.settings.public.Collective.name)}`;
      tags.description = `${TAPi18n.__('country-tag-description').replace('{{country}}', country).replace('{{collective}}', Meteor.settings.public.Collective.name)}`;
      tags.image = _parseURL(Meteor.settings.public.Collective.profile.logo);
      break;
    default:
      tags = {
        title: `${Meteor.settings.public.Collective.name} - ${Meteor.settings.public.Collective.profile.bio}`,
        description: Meteor.settings.public.Collective.profile.bio,
        image: _parseURL(Meteor.settings.public.Collective.profile.logo),
      };
      break;
  }
  if (Meteor.settings.private.API.facebook.appId) {
    tags.facebookId = Meteor.settings.private.API.facebook.appId;
  }
  if (Meteor.settings.public.Collective.profile.twitter) {
    tags.twitter = Meteor.settings.public.Collective.profile.twitter;
  }

  const head = meta(tags, true);
  sink.appendToHead(head);

  let hostname;
  if (Meteor.isServer) {
    Meteor.onConnection(function (result) {
      hostname = result;
    });
  }

  log(`{ server: 'onPageLoad', path: '${url}', httpHeader: '${JSON.stringify(hostname)}' }`);
});
