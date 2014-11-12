angular.module('testApp', ['ngResource'])
    .factory('tasks', ['$resource', '$q', function ($resource, $q) {

        var r = $resource('https://gist.githubusercontent.com/thireven/841b585de43a7d708bff/raw/abe8f8ceacff3817fb3ee5bf8219408819563629/sequence_sample.json',
            null,
            {
                'get': {'method': 'GET', isArray: true}
            });

        return function () {
            var self = {};

            self.get = function () {
                var d = $q.defer();

                r.get().$promise.then(function(data){
                    var sequences = data[0].sequences;
                    var t = [];
                    console.log("sequences : ", sequences);
                    for(var i=0; i<sequences.length; i++){
                        var seq = sequences[i];
                        console.log("task : ", seq.tasks);
                        if(seq.tasks != undefined){
                            t = t.concat(seq.tasks);
                        }
                    }

                    d.resolve(t);
                });

                return d.promise;
            }

            return self;
        }();
    }])
    .controller('mainController', ['$sce', '$scope', '$timeout', 'tasks', function ($sce, $scope, $timeout, tasks) {

        var editor = ace.edit("editor");
        var currentTask = null;

        $scope.tasks = [];

        $scope.infoContainerContent = "";

        $scope.taskType = 'info';

        tasks.get().then(function(data){
            $scope.tasks = data;
        });

        $scope.lines = null;

        $scope.taskClicked = function(task){
            $scope.showTask(task);
        }

        $scope.showTask = function(task){

            console.log("show task : ", task);
            currentTask = task;

            $scope.taskType = task.options.type;

            console.log("task.options.type : ", task.options.type);
            if(task.options.type == 'info'){
                console.log("info");
                $scope.lines = $sce.trustAsHtml(task.lines);
            }else{
                $scope.lines = [];
                _.each(task.lines, function(line){
                    console.log("line : ", line);
                    var l = _.unescape(line);
                    console.log("l : ", _.unescape(line));
                    $scope.lines.push(l);
                });
            }

            editor.focus();
        }

        var nextTask = function(){
            tasks.get().then(function(){
                var index = _.indexOf($scope.tasks, currentTask);
                var nextIndex = (index == -1)?0:index+1;
                console.log("index : ", index);
                if(nextIndex >= $scope.tasks.length){
                    nextIndex = 0;
                }

                $timeout(function(){
                    $scope.showTask($scope.tasks[nextIndex]);
                });

                editor.getSession().setValue("");
            });
        }

        editor.setTheme("ace/theme/monokai");
        editor.getSession().setMode("ace/mode/html");

        editor.getSession().on('change', function(){
            console.log(editor.getValue());
            if(editor.getValue().indexOf("\n") !== -1){
                console.log("new line");
                console.log("editor.getValue() : ", editor.getValue().length);

                nextTask();
            }
        });

        nextTask();
    }]);