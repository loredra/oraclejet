/**
 * Copyright (c) 2014, 2016, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */
define(['knockout'],
        function (ko)
        {
            var self = this;
            
            self.previousName = ko.observable("");
            self.previousFilterCountry = ko.observableArray([]);
            self.previousFilterList = ko.observableArray([]);
            var oldSizeTreeCountry, oldPosTreeCountry, oldPosTreeList, oldSizeTreeList;
            
            var langSel ;
            
            function setLanguage(language){
                langSel = language;
            };
            
            function getLanguage(){
                return langSel;
            }
            
            function rememberState(name,filterTreeCountry,filterTreeList){
                self.previousName(name);
                if(filterTreeCountry===undefined)
                    self.previousFilterCountry([""]);
                else
                self.previousFilterCountry(filterTreeCountry);
                if(filterTreeList === undefined)
                    self.previousFilterList([""]);
                else
                self.previousFilterList(filterTreeList);
            };
            
            function resetState(){
                var previous = new Array();
                previous.push(self.previousName());
                previous.push(self.previousFilterCountry());
                previous.push(self.previousFilterList());
                return previous;
            };
            
            function rememberPositionTrees(sizeTreeCountry ,posTreeCountry, sizeTreeList, posTreeList){
                oldSizeTreeCountry = sizeTreeCountry;
                oldPosTreeCountry = posTreeCountry;
                oldSizeTreeList = sizeTreeList;
                oldPosTreeList = posTreeList;
            };
            
            function resetTreesPos(){
                var previousTreePos = new Array();
                previousTreePos.push(oldSizeTreeCountry);
                previousTreePos.push(oldPosTreeCountry);
                previousTreePos.push(oldSizeTreeList);
                previousTreePos.push(oldPosTreeList);
                return previousTreePos;
            };
            
            // cookie utility classes
            function createCookie(name, value, days) {
                if (days) {
                    var date = new Date();
                    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                    var expires = "; expires=" + date.toGMTString();
                }
                else
                    var expires = "";
                document.cookie = name + "=" + value + expires + "; path=/";
            }

            function readCookie(name) {
                var nameEQ = name + "=";
                var ca = document.cookie.split(';');
                for (var i = 0; i < ca.length; i++) {
                    var c = ca[i];
                    while (c.charAt(0) == ' ')
                        c = c.substring(1, c.length);
                    if (c.indexOf(nameEQ) == 0)
                        return c.substring(nameEQ.length, c.length);
                }
                return null;
            }

            function eraseCookie(name) {
                createCookie(name, "", -1);
            }


            self.appSettings = ko.observableArray([]);

            function readSettings() {

                var tempArray = [];
                if (readCookie('peopleLayout')) {
                    tempArray = tempArray + [readCookie('peopleLayout')];
                } else {
                    createCookie('peopleLayout', 'peopleCardLayout');
                }
            }

            function getSettingsFromCookie() {
                var ca = document.cookie.split(';');
                return ca;
            }

            function QueryString() {
                // This function is anonymous, is executed immediately and 
                // the return value is assigned to QueryString!
                var query_string = {};
                var query = window.location.search.substring(1);
                var vars = query.split("&");
                for (var i = 0; i < vars.length; i++) {
                    var pair = vars[i].split("=");
                    // If first entry with this name
                    if (typeof query_string[pair[0]] === "undefined") {
                        query_string[pair[0]] = pair[1];
                        // If second entry with this name
                    } else if (typeof query_string[pair[0]] === "string") {
                        var arr = [query_string[pair[0]], pair[1]];
                        query_string[pair[0]] = arr;
                        // If third or later entry with this name
                    } else {
                        query_string[pair[0]].push(pair[1]);
                    }
                }
                return query_string;
            };

            return {setLanguage:setLanguage,getLanguage:getLanguage,rememberPositionTrees:rememberPositionTrees,resetTreesPos:resetTreesPos, rememberState:rememberState, resetState:resetState, createCookie: createCookie, readCookie: readCookie, eraseCookie: eraseCookie, readSettings: readSettings, QueryString: QueryString};

        });
