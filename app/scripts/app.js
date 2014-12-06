angular.module('app', ['ngCookies', 'LocalForageModule', 'ui.router', 'ui.bootstrap', 'ngQuill', 'colorpicker.module'])

.config(function($stateProvider, $urlRouterProvider, $httpProvider, $provide, ParseUtilsProvider, Config){
  'use strict';
  // catch exceptions in angular
  $provide.decorator('$exceptionHandler', ['$delegate', function($delegate){
    return function(exception, cause){
      $delegate(exception, cause);

      var data = {
        type: 'angular'
      };
      if(cause)               { data.cause    = cause;              }
      if(exception){
        if(exception.message) { data.message  = exception.message;  }
        if(exception.name)    { data.name     = exception.name;     }
        if(exception.stack)   { data.stack    = exception.stack;    }
      }

      Logger.track('exception', data);
    };
  }]);

  var access = routingConfig.accessLevels;

  // Public routes
  $stateProvider
  .state('public', {
    abstract: true,
    template: '<ui-view/>',
    data: {
      access: access.public
    }
  });

  // Anonymous routes
  $stateProvider
  .state('anon', {
    abstract: true,
    template: '<ui-view/>',
    data: {
      access: access.anon
    }
  })
  .state('anon.login', {
    url: '/login',
    templateUrl: 'views/login.html',
    controller: 'LoginCtrl'
  });

  // Regular user routes
  $stateProvider
  .state('user', {
    abstract: true,
    templateUrl: 'views/layout.html',
    controller: 'MainCtrl',
    data: {
      access: access.user
    }
  })
  .state('user.home', {
    url: '/',
    templateUrl: 'views/home.html'
  })
  .state('user.tasks', {
    url: '/tasks',
    templateUrl: 'views/tasks/main.html',
    controller: 'TasksCtrl'
  })
  .state('user.accounts', {
    url: '/accounts',
    templateUrl: 'views/accounts/main.html',
    controller: 'AccountsCtrl'
  })
  .state('user.contacts', {
    url: '/contacts',
    templateUrl: 'views/contacts/main.html',
    controller: 'ContactsCtrl'
  })
  .state('user.linkedinApi', {
    url: '/linkedin-api',
    templateUrl: 'views/linkedin/api.html',
    controller: 'LinkedinApiCtrl'
  })
  .state('user.linkedinScraper', {
    url: '/linkedin-scraper',
    templateUrl: 'views/linkedin/scraper.html',
    controller: 'LinkedinScraperCtrl'
  })
  .state('user.profile', {
    url: '/profile',
    templateUrl: 'views/profile.html',
    controller: 'ProfileCtrl'
  });

  $urlRouterProvider.otherwise('/');

  ParseUtilsProvider.initialize(Config.parse.applicationId, Config.parse.restApiKey);

  // logout on http status 401 or 403
  $httpProvider.interceptors.push(['$q', '$location', function($q, $location){
    return {
      'responseError': function(response){
        if(response.status === 401 || response.status === 403){
          $location.path('/login');
        }
        return $q.reject(response);
      }
    };
  }]);
})

.constant('Config', Config)
.constant('DataList', {
  contactStatuses: ['target', 'contact', 'prospect', 'client']
})

.run(function($rootScope, $state, $window, UserSrv, LogSrv, Utils){
  'use strict';
  // init
  var data = {}, fn = {};
  $rootScope.root = {data: data, fn: fn};

  fn.toggleSidebar = function(){
    data.sidebarOpened = !data.sidebarOpened;
  };

  var mobileView = 992;
  $rootScope.$watch(function(){ return $window.innerWidth; }, function(newValue){
    if(newValue >= mobileView){
      if (data.sidebarOpened === undefined){
        data.sidebarOpened = true;
      }
    } else {
      data.sidebarOpened = false;
    }
  });

  $window.onresize = function(){ $rootScope.$apply(); };

  // Controls if user is authentified
  $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){
    if(!(toState && toState.data && toState.data.access)){
      LogSrv.trackError('NoAccessRestrictionForState', 'State <'+toState.name+'> has no access data !!!');
      event.preventDefault();
    } else {
      if(!UserSrv.isAuthorized(toState.data.access)){
        UserSrv.isAuthorizedAsync(toState.data.access).then(function(authorized){
          if(!authorized){
            LogSrv.trackError('UnauthorizedUser', 'User tried to access <'+toState.name+'> state with no authorization !!!');
            event.preventDefault();

            if(fromState.url === '^'){
              if(UserSrv.isLoggedIn()){
                $state.go('user.home');
              } else {
                $rootScope.error = null;
                $state.go('anon.login');
              }
            }
          }
        });
      }
    }
  });

  // utils
  $rootScope.safeApply = function(fn){
    var phase = this.$root ? this.$root.$$phase : this.$$phase;
    if(phase === '$apply' || phase === '$digest'){
      if(fn && (typeof(fn) === 'function')){
        fn();
      }
    } else {
      this.$apply(fn);
    }
  };

  $rootScope.trustHtml = Utils.trustHtml;
});
