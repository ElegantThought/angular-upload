'use strict';

angular.module('lr.upload.formdata', [])

  // Convert all data properties to FormData,
  // if they are a jqLite element, extract the files from the input
  .factory('formDataTransform', function() {
    return function formDataTransform( data ) {
      var formData = new FormData();

      // Extract file elements from within config.data
      angular.forEach(data, function( value, key ) {

        // If it's an element that means we should extract the files
        if ( angular.isElement(value) ) {
          var files = [];
          // Extract all the Files from the element
          angular.forEach(value, function( el ) {
            angular.forEach(el.files, function( file ) {
              files.push(file);
            });
          });

          // Do we have any files?
          if ( files.length !== 0 ) {

            // If we have multiple files we send them as a 0 based array of params
            // file[0]=file1&file[1]=file2...
            if ( files.length > 1 ) {
              angular.forEach(files, function( file, index ) {
                formData.append(key + '[' + index + ']', file);
              });
            } else {
              formData.append(key, files[0]);
            }
          }
        } else {
          // If it's not a element we append the data as normal
          formData.append(key, value);
        }
      });

      return formData;
    };
  })

  .factory('formDataUpload', function( $http, formDataTransform, $q, $timeout ) {
    return function formDataUpload( config ) {
      config.transformRequest = formDataTransform;
      config.headers = angular.extend(config.headers || {}, {'Content-Type': undefined});
      config.headers.__setXHR_ = function() {
        return function( xhr ) {
          if ( !xhr ) {
            return;
          }

          config.__XHR = xhr;

          if ( config.xhrFn ) {
            config.xhrFn(xhr);
          }

          xhr.upload.addEventListener('progress', function( e ) {
            e.config = config;
            if ( deferred.notify ) {
              deferred.notify(e);
            } else {
              if ( promise.progressFunction ) {
                $timeout(function() {
                  promise.progressFunction(e);
                });
              }

            }

          }, false);

          xhr.upload.addEventListener('load', function( e ) {
            if ( e.lengthComputable ) {
              e.config = config;
              if ( deferred.notify ) {
                deferred.notify(e);
              } else {
                if ( promise.progressFunction ) {
                  $timeout(function() {
                    promise.progressFunction(e);
                  });
                }

              }

            }
          }, false);
        };
      };
      var deferred = $q.defer();
      var promise = deferred.promise;

      $http(config).then(function( r ) {
        deferred.resolve(r);
      }, function( e ) {
        deferred.reject(e);
      }, function( n ) {
        deferred.notify(n);
      });

      promise.success = function( fn ) {
        promise.then(function( response ) {
          fn(response, response.status, response.headers, config);
        });
        return promise;
      };

      promise.error = function( fn ) {
        promise.then(null, function( response ) {
          fn(response, response.status, response.headers, config);
        });
        return promise;
      };

      promise.progress = function( fn ) {
        promise.progressFunction = fn;
        promise.then(null, null, function( update ) {
          fn(update);
        });
        return promise;
      };
      promise.abort = function() {
        if ( config.__XHR ) {
          $timeout(function() {
            config.__XHR.abort();
          });
        }
        return promise;
      };
      promise.xhr = function( fn ) {
        config.xhrFn = (function( origXhrFn ) {
          return function() {
            if ( origXhrFn ) {
              origXhrFn.apply(promise, arguments);
            }
            fn.apply(promise, arguments);
          };
        })(config.xhrFn);
        return promise;
      };

      return promise;
    };
  });
