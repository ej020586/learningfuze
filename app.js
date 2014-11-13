angular.module('testApp', ['ngResource'])
    .factory('sequences', ['$resource', '$q', function ($resource, $q) {

        var r = $resource('https://gist.githubusercontent.com/thireven/841b585de43a7d708bff/raw/abe8f8ceacff3817fb3ee5bf8219408819563629/sequence_sample.json',
            null,
            {
                'get': {'method': 'GET', isArray: true}
            });

        return function () {
            var self = {};
            var sequences = null;
            var data = null;

            self.load = function(){
                var d = $q.defer();

                r.get().$promise.then(function (res) {
                    data = res[0];
                    sequences = data.sequences;

                    d.resolve();
                });

                return d.promise;
            }

            self.getData = function(){
                return data;
            }

            self.getTasks = function (seqenceId) {
                var t = [];

                if(seqenceId){
                    var seq = self.getSequence(seqenceId);
                    t = seq.tasks;
                }else{
                    //get all tasks
                    for (var i = 0; i < sequences.length; i++) {
                        var seq = sequences[i];
                        if (seq.tasks != undefined) {
                            t = t.concat(seq.tasks);
                        }
                    }
                }

                return t;
            }

            self.getSequence = function(id){
                var sId = (id)?id:false;
                var r = sequences;
                if(sId){
                    r = _.findWhere(sequences, {"id":id});
                }
                return r;
            }

            return self;
        }();
    }])
    .controller('mainController', ['$document', '$parse', '$sce', '$scope', '$timeout', 'sequences', function ($document, $parse, $sce, $scope, $timeout, sequences) {
        var editor = null;
        $document.ready(function(){
            editor= ace.edit("editor");

            editor.setTheme("ace/theme/monokai");
            editor.getSession().setMode("ace/mode/text");

            editor.getSession().on('change', function () {
                if(editor.getValue().length == 0){
                    return;
                }
                //check if the last character is a new line
                if (editor.getValue().lastIndexOf("\n") === editor.getValue().length - 1) {
                    //when the type is info go to the next task
                    if (currentTask.options.type == 'info') {
                        nextTask();
                    } else if (currentTask.isValid) {
                        nextTask();
                    } else {
                        validateLines();
                    }
                } else {
                    validateLines();
                }
            });

            nextTask();
        })
        var currentTask = null;

        $scope.sequences = [];
        $scope.tasks = [];
        $scope.infoContainerContent = "";
        $scope.taskType = 'info';
        $scope.btnHighlightClass = 'btn-success';
        $scope.lines = null;
        $scope.title = "";
        $scope.infoTitle = "";

        Object.defineProperty($scope, 'infoTitle',{
            get : function(){
                return (currentTask.options.type == 'info')?"Instructions":"Lession Board";
            }
        });

        sequences.load().then(function () {
            $scope.title = sequences.getData().name;
            $scope.tasks = sequences.getTasks();

            $scope.sequences = sequences.getSequence();
        });



        $scope.taskClicked = function (task) {
            $scope.showTask(task);
        }

        $scope.showTask = function (task) {
            $scope.currentTask = currentTask = task;

            $scope.taskType = task.options.type;

            if (task.options.type == 'info') {
                $scope.lines = $sce.trustAsHtml(task.lines);
            } else {
                $scope.lines = [];
                _.each(task.lines, function (line, index) {
                    var l = $sce.trustAsHtml(line);
                    var obj = {
                        "trustedHtml": l,
                        "raw": line,
                        "class": "invalid-text",
                        "valid": false,
                        "show": true
                    };
                    if (index > 0) {
                        obj.show = false;
                    }
                    $scope.lines.push(obj);
                });
            }

            editor.focus();
        }

        var nextTask = function () {
            sequences.load().then(function () {
                var index = _.indexOf($scope.tasks, currentTask);
                var nextIndex = (index == -1) ? 0 : index + 1;
                if (nextIndex >= $scope.tasks.length) {
                    nextIndex = 0;
                    $('#myModal').modal({});
                }

                $timeout(function () {
                    $scope.showTask($scope.tasks[nextIndex]);
                });

                editor.getSession().setValue("");
            });
        }

        var validateLines = function () {
            var rows = editor.getSession().getLength();
            var amountValid = 0;

            for(var i = 0; i<rows; i++){
                var inputLineContent = editor.getSession().getLine(i);
                if (inputLineContent == "") {
                    return true;
                }
                //retrieve incoded html from the DOM
                $scope.lines[i].html = _.unescape($('#info ol li').eq(i).html());

                var nextLineIndex = i+1;
                if (inputLineContent === $scope.lines[i].html) {
                    $scope.lines[i].class = "valid-text";
                    $scope.lines[i].valid = true;
                    amountValid = (amountValid+1 < $scope.lines.length)?amountValid+1:$scope.lines.length;
                    if(nextLineIndex < $scope.lines.length){
                        defineShowByIndex(nextLineIndex, true);
                    }
                } else {
                    $scope.lines[i].class = "invalid-text";
                    $scope.lines[i].valid = false;
                    amountValid = (amountValid-1 > 0)?amountValid-1:0;
                    if(nextLineIndex < $scope.lines.length){
                        defineShowByIndex(nextLineIndex, false);
                    }
                }
                $scope.$digest();
            };

            if(amountValid == $scope.lines.length){
                currentTask.isValid = true;
            }else{
                currentTask.isValid = false;
            }
        }

        var defineShowByIndex = function(i, val){
            $scope.lines[i].show = val;
            $scope.$digest();
        }
    }]);