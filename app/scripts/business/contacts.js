angular.module('app')

.factory('ContactSrv', function($q, ParseUtils, LinkedinSrv){
  'use strict';
  var service = ParseUtils.createCrud('/classes/Contact');
  service.addSocialProfile = function(elt, provider, profile){
    var toSave = angular.copy(elt);
    if(!toSave.social){ toSave.social = {}; }

    var promise = $q.when();
    if(provider === 'linkedin'){
      promise = LinkedinSrv.getWithId(profile.id).then(function(parseProfile){
        if(parseProfile){ return parseProfile; }
        else {
          var profileToSave = angular.copy(profile);
          delete profileToSave._meta;
          return LinkedinSrv.save(profileToSave);
        }
      }).then(function(parseProfile){
        if(!toSave.image)       { toSave.image = profile.image;                }
        if(!toSave.firstName)   { toSave.firstName = profile.firstName;        }
        if(!toSave.lastName)    { toSave.lastName = profile.lastName;          }
        if(!toSave.headline)    { toSave.headline = profile.headline;          }
        if(!toSave.location)    { toSave.location = profile.location;          }
        if(!toSave.experiences) { toSave.experiences = profile.experiences;    }
        if(!toSave.websites)    { toSave.websites = profile.summary.websites;  }
        toSave.social[provider] = {
          parseId: parseProfile.objectId,
          id: profile.id,
          url: profile.canonicalUrl,
          urls: [profile.canonicalUrl, profile.url]
        };
      });
    } else {
      console.warn('Unknown provider <'+provider+'>');
    }

    return promise.then(function(){
      return service.save(toSave);
    });
  };
  service.removeSocialProfile = function(elt, provider){
    if(elt && elt.social && elt.social[provider]){
      var toSave = angular.copy(elt);
      delete toSave.social[provider];
      return service.save(toSave);
    } else {
      return $q.when(angular.copy(elt));
    }
  };
  return service;
})

.controller('ContactsCtrl', function($scope, CrudRestUtils, ContactSrv, AccountSrv, CollectionUtils){
  'use strict';
  var defaultSort = {order: 'lastName'};
  var defaultFormElt = {};
  $scope.crud = CrudRestUtils.createCrudCtrl(ContactSrv, defaultSort, defaultFormElt);
  $scope.cache = ContactSrv.cache;

  var data = {}, fn = {};
  $scope.data = data;
  $scope.fn = fn;
  AccountSrv.getAll().then(function(accounts){
    data.accounts = accounts;
  });
  data.selectedEls = [];

  fn.isSelected =     function(elt) { return data.selectedEls.indexOf(elt) >= 0;                                                                                                                };
  fn.isNoneSelected = function()    { return data.selectedEls.length === 0;                                                                                                                     };
  fn.isSomeSelected = function()    { return $scope.crud && $scope.crud.data && $scope.crud.data.elts && 0 < data.selectedEls.length && data.selectedEls.length < $scope.crud.data.elts.length; };
  fn.isAllSelected =  function()    { return $scope.crud && $scope.crud.data && $scope.crud.data.elts && data.selectedEls.length === $scope.crud.data.elts.length;                              };
  fn.toggleElt = function(elt){
    $scope.crud.fn.toggle(elt);
    var index = data.selectedEls.indexOf(elt);
    if(index >= 0){
      data.selectedEls.splice(index, 1);
    } else {
      data.selectedEls.push(elt);
    }
  };
  fn.toggleAll = function(){
    if($scope.crud && $scope.crud.data && $scope.crud.data.elts){
      var allElts = $scope.crud.data.elts;
      if(fn.isNoneSelected()){
        for(var i in allElts){
          data.selectedEls.push(allElts[i]);
        }
      } else {
        CollectionUtils.clear(data.selectedEls);
      }
    }
  };
})

.directive('contact', function(UserSrv, ContactSrv, LinkedinSrv, $http){
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'views/contacts/partials/details.html',
    scope: {
      elt: '='
    },
    link: function(scope, element, attr){
      var data = {}, fn = {};
      scope.data = data;
      scope.fn = fn;
      scope.$watch('elt', function(val, old){
        data.linkedin = { loading: false };
      });

      UserSrv.getCurrent().then(function(user){
        data.user = user;
      });

      fn.findOnLinkedin = function(contact){
        data.linkedin.loading = true;
        LinkedinSrv.search(data.user.secrets.linkedinScraperUrl.value, contact.firstName, contact.lastName).then(function(results){
          if(results){
            data.linkedin.results = results;
          }
          data.linkedin.loading = false;
        }, function(){
          data.linkedin.loading = false;
        });
      };

      fn.associateWithLinkedin = function(profile){
        profile._meta = {loading: true};
        LinkedinSrv.fetch(data.user.secrets.linkedinScraperUrl.value, profile.url).then(function(linkedinProfile){
          if(linkedinProfile){
            ContactSrv.addSocialProfile(scope.elt, 'linkedin', linkedinProfile).then(function(updated){
              angular.copy(updated, scope.elt);
              delete data.linkedin.results;
            });
          }
        });
      };
    }
  };
})

.directive('contactForm', function(AccountSrv, DataList){
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'views/contacts/partials/form.html',
    scope: {
      elt: '='
    },
    link: function(scope, element, attr){
      var data = {};
      scope.data = data;
      data.statuses = DataList.contactStatuses;
      AccountSrv.getAll().then(function(accounts){
        data.accounts = accounts;
      });
    }
  };
});
