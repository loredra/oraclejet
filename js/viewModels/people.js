/**
 * Copyright (c) 2014, 2016, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */
define(['ojs/ojcore', 'knockout', 'utils', 'data/data', 'jquery', 'ojs/ojrouter', 'ojs/ojknockout', 'promise', 'ojs/ojlistview',
    'ojs/ojmodel', 'ojs/ojpagingcontrol', 'ojs/ojpagingcontrol-model', 'ojs/ojbutton', 'ojs/ojtreemap', 'ojs/ojtree', 'libs/jsTree/jstree',
    'ojs/ojselectcombobox', 'ojs/ojjsontreedatasource'],
        function (oj, ko, utils, data, $)
        {
            function PeopleViewModel() {
                var self = this;

                /**/
                self.peopleLayoutType = ko.observable('peopleCardLayout');

                self.allPeople = ko.observableArray([]);
                self.ready = ko.observable(false);
                /**/


                /**/
                self.nameSearch = ko.observable('');
                self.url = ko.observable('/solr/CoreOne/select?indent=on&wt=json&rows=24');
                self.highlightField = ko.observable('&hl.fl=nam_comp_name&hl.simple.pre=<span class="highlight">&hl.simple.post=</span>&hl=on');
                self.groupField = ko.observable('&group.cache.percent=100&group.field=ent_id&group.ngroups=true&group.truncate=true&group=true');
                self.facetField = ko.observable('&facet.field=add_country&facet.field=add_city&facet.field=lis_name&facet=on');
                self.scoreField = ko.observable('&fl=*,score');
                self.queryField = ko.observable('&q={!percentage t=QUERY_SIDE pw=0.8 f=nam_comp_name}');
                self.fqField = ko.observable('&fq=');
                /**/

                //Observable array for the HIGHLIGHTING data group
                self.allHighlighting = ko.observableArray([]);
                self.nameHighlight = ko.observableArray([]);

                //Observable array for Facets
                self.facetsCountries = ko.observableArray([]);
                self.facetsLists = ko.observableArray([]);

                //variables to control data requests
                var nameBeforeUpdate = '';




                //Observable array for the filter tree
                self.filterTree = ko.observableArray([]);
                self.fq = ko.observable("");
                self.filterTreeList = ko.observableArray([]);
                self.fqList = ko.observable("");
                //Observable for the comunication from the selection function "filteredAllPeople" to tree change events
                self.filterTreeObs = ko.observable("");

                //data tree observable array
                self.dataTree = ko.observableArray([]);

                //control access to tree method
                self.treeInit = ko.observable("");

                //Observable array for the filter to apear on the combobox when it is selcted
                self.comboboxSelectValue = ko.observable([]);
                self.comboObservable = ko.observable("");
                //Observable array to transport filter information from the tree change event to valueChangeHandleCombobox function
                self.arrSelCheckbox = ko.observableArray([]);


                //nodes for OJ Tree
                self.nodeTreeCountry = ko.observableArray([]);
                self.nodeTreeList = ko.observableArray([]);

                //workers
                self.worker = new Worker('js/viewModels/worker.js');
                self.workerList = new Worker('js/viewModels/workerList.js');

//              self.worker.onmessage = function(event){
//              console.log(event.data);  
//              };
//
//              self.worker.postMessage("hello worker");


                //store the worker result
                self.workerResult = ko.observableArray([]);
                self.workerListResult = ko.observableArray([]);


                //something temporary for the expand feature of the tree
                var treeExpanded = false;


                self.searched = ko.observableArray([]);


                self.keepFilter = false;


                //a ko observable to display the number of hits
                self.numberMatches = ko.observable("");
                
                //a ko observable to display when there are no results
                self.noResults = ko.observable("");


                //self.filterTreeObs.extend({rateLimit: {timeout: 300, method: "notifyWhenChangesStop"}});

                /************************************** FILTER FUNCTION ***********************************************************/

                //limit the retrieve data for every search input
                self.nameSearch.extend({rateLimit: {timeout: 300, method: "notifyWhenChangesStop"}});


                self.filteredAllPeople = ko.computed(function () {
                    var peopleFilter = new Array();

                    //console.log("before first if");



                    if (self.nameSearch().length === 0) {
                        peopleFilter = [];
                        self.facetsCountries([""]);
                        self.numberMatches("");
                        
//                        self.keepFilter = false;
//                        for (var i = 0; i < self.comboboxSelectValue().length; ++i) {
//                            if (self.comboboxSelectValue()[i] === undefined)
//                                self.comboboxSelectValue().splice(i, 1);
//                        }
                        //self.facetsCountries([""]);

                        //$('#tree').ojTree("refresh");
                        //self.facetsCountries([""]);
                        //self.filterTree([]);
                        //$("#tree").ojTree("deselectAll");

                    } else {

                        if (self.nameSearch() !== nameBeforeUpdate || self.filterTreeObs() === "ready") {

                            if (self.filterTreeObs() === "done")
                                self.keepFilter = false;

                            if (self.filterTreeObs() === "ready")
                                self.keepFilter = true;

                            if (self.comboObservable() === "combobox")
                                if(self.comboboxSelectValue().length === 0)
                                    self.keepFilter = false;


                            //Facets Filter
                            var fqCountries = self.fq();
                            var fqLists = self.fqList();


                            var name = "";
                            /*** To replace the whitespaces with "~" *********/
                            name = self.nameSearch().replace(/\s+/g, '~ ');
                            /*** To delete the whitespaces from the end of the words ***/
                            name = name.replace(/\s*$/, "");
                            /*** Add "~" for more than 3 chars ***/
                            if (name.length >= 3)
                                name = name + "~";
                            /*** Remove multiple "~" ***/
                            name = name.replace(/\~+/g, '~');
                            console.log("name Query: " + name);
                            if (fqCountries.search("undefined") !== -1)
                                fqCountries = "";
                            
                            

                            $.getJSON(
                                    self.url().toString() +
                                    self.highlightField().toString() +
                                    self.groupField().toString() +
                                    self.facetField().toString() +
                                    self.scoreField().toString() + fqCountries + fqLists +
                                    self.queryField().toString() +
                                    name).then(function (people) {
                                self.allPeople(people);
                                self.allHighlighting(people.highlighting);
                                self.facetsCountries(people.facet_counts.facet_fields.add_country);
                                self.facetsLists(people.facet_counts.facet_fields.lis_name);
                                self.numberMatches(people.grouped.ent_id.ngroups + " Hits");


                            }).fail(function (error) {
                                console.log('Error in getting People data: ' + error.message);
                            });
                            //self.fq("");

                            self.filterTreeObs("done");
                            self.comboObservable("done");
                            nameBeforeUpdate = self.nameSearch();



                        }

                        if (self.allPeople().grouped !== undefined)
                            peopleFilter = self.allPeople().grouped.ent_id.groups;
                        
                        

                    }
                    //console.log(self.comboboxSelectValue());
                    
                    //if (self.allPeople().grouped !== undefined)
                    //self.numberMatches(self.allPeople().grouped.ent_id.ngroups);

                    self.ready(true);
                    return peopleFilter;
                });



                //self.filteredAllPeople.extend({rateLimit: {timeout: 200, method: "notifyWhenChangesStop"}});


                self.getNodeDataCountry = function (node, fn) {
                    fn(self.workerResult());
                };

                self.getNodeDataList = function (node, fn) {
                    fn(self.workerListResult());
                };

                /*/
                 self.listViewDataSource = ko.computed(function () {
                 return new oj.ArrayTableDataSource(self.filteredAllPeople(), {idAttribute: 'empId'});
                 });
                 /**/

                /**/
                self.cardViewPagingDataSource = ko.computed(function () {
                    return new oj.ArrayPagingDataSource((self.filteredAllPeople()));
                });

                self.cardViewPagingDataSource.extend({rateLimit: {timeout: 20, method: "notifyWhenChangesStop"}});


                self.cardViewPagingDataSource.subscribe(function (newValue) {
                    if(self.numberMatches() === "0 Hits"){
                        self.numberMatches("");
                        self.noResults("No Results");
                    }
                    if(self.numberMatches() !== "0 Hits" && self.numberMatches() !== ""){
                        self.noResults("");
                    }
                    if (self.keepFilter === false) {
                        self.worker.postMessage(self.facetsCountries());
                        self.worker.onmessage = function (m) {
                            self.workerResult(m.data);
                            $('#tree').ojTree("refresh");
                            $('#tree').ojTree("expandAll");
                        };
                        self.workerList.postMessage(self.facetsLists());
                        self.workerList.onmessage = function (m) {
                            self.workerListResult(m.data);
                            $('#treeList').ojTree("refresh");
                            $('#treeList').ojTree("expandAll");
                        };
                    }
                    if (!self.keepFilter && self.nameSearch().length === 0) {
                        self.workerResult("");
                        $('#tree').ojTree("refresh");
                    }

                    $("#combobox").on("ojoptionchange", function (event, data) {
                        //for the delete of an element from combobox
                        //$("#combobox").ojCombobox( { "disabled": true } );
                        if (data.previousValue.length > data.value.length) {
                            //To see which value is removed from the combobox, a value from the country or from list
                            var selected = new Array();
                            $.grep(data.previousValue, function (el) {
                                if ($.inArray(el, data.value) === -1)
                                    selected.push(el);
                            });
                            selected;


                            var isCountry = self.filterTree().find(function (el) {
                                return el === selected[0];
                            });
                            var isList = self.filterTreeList().find(function (el) {
                                return el === selected[0];
                            });

                            if (isCountry !== undefined) {
                                var oldTreeCountry = self.filterTree();
                                var newTreeCountry = new Array();
                                $.grep(oldTreeCountry, function (el) {
                                    if ($.inArray(el, selected) === -1)
                                        newTreeCountry.push(el);
                                });
                                self.filterTree(newTreeCountry);
                                self.processFilterCountries();
                            }
                            if (isList !== undefined) {
                                var oldTreeList = self.filterTreeList();
                                var newTreeList = new Array();
                                $.grep(oldTreeList, function (el) {
                                    if ($.inArray(el, selected) === -1)
                                        newTreeList.push(el);
                                });
                                self.filterTreeList(newTreeList);
                                self.processFilterLists();
                                //self.comboObservable("combobox");
                            }
                              
//                            if(data.value.length === 0 )
//                            self.comboObservable("combobox");
                        }
                        
                        event.stopImmediatePropagation();
                    });

                    $("#tree").on("ojoptionchange", function (e, ui) {
                        if (ui.option === "selection") {
                            var filterValue = $(ui.value).attr("id");
                            if (filterValue !== "country" && filterValue !== undefined) {
                                var foundDuplicate = self.filterTree().find(function (el) {
                                    return filterValue === el;
                                });
                                if (foundDuplicate === undefined) {
                                    self.filterTree().push(filterValue);
                                    self.keepFilter = true;
                                    self.filterTreeObs("load");
                                    self.processFilterCountries();
                                    $("#tree").ojTree("deselectAll");
                                }
                            }
                            e.stopImmediatePropagation();
                        }
                    });

                    $("#treeList").on("ojoptionchange", function (e, ui) {
                        if (ui.option === "selection") {
                            var pos = $(ui.value).text().indexOf(",");
                            var filterValue = $(ui.value).children("a").children("span").text().substring(0, pos - 2);
                            if (filterValue !== "list" && filterValue !== undefined && filterValue !== "") {
                                var foundDuplicate = self.filterTreeList().find(function (el) {
                                    return filterValue === el;
                                });
                                if (foundDuplicate === undefined) {
                                    self.filterTreeList().push(filterValue);
                                    self.keepFilter = true;
                                    self.filterTreeObs("load");
                                    self.processFilterLists();
                                    $("#treeList").ojTree("deselectAll");
                                }
                            }
                            e.stopImmediatePropagation();
                        }
                    });

                    self.comboboxSelectValue(self.filterTree().concat(self.filterTreeList()));
                    //self.filterTreeObs("ready");

                });
                /**/

//                self.filterTree.subscribe(function(newValue){
//                    self.filterTreeObs("ready");
//                });

                //Process filter for countries
                self.processFilterCountries = function () {
                    var fq = "";
                    if (self.filterTree().length > 0) {
                        fq = "add_country:" + "\"" + self.filterTree()[0] + "\"";
                        for (var i = 1; i < self.filterTree().length; ++i) {
                            if (self.filterTree()[i] !== undefined)
                                fq = fq + " OR " + "add_country:" + "\"" + self.filterTree()[i] + "\"";
                        }
                        fq = "&fq=" + fq;
                    }
                    if (self.filterTree().length === 0)
                        fq = "";

                    self.fq(fq);

                    self.filterTreeObs("ready");
                };

                //Process filter for Lists
                self.processFilterLists = function () {
                    var fqList = "";

                    if (self.filterTreeList().length > 0) {
                        fqList = "lis_name:" + "\"" + self.filterTreeList()[0] + "\"";
                        for (var i = 1; i < self.filterTreeList().length; ++i) {
                            if (self.filterTreeList()[i] !== undefined)
                                fqList = fqList + " OR " + "lis_name:" + "\"" + self.filterTreeList()[i] + "\"";
                        }
                        fqList = "&fq=" + fqList;
                    }
                    if (self.filterTreeList().length === 0)
                        fqList = "";

                    self.fqList(fqList);

                    self.filterTreeObs("ready");

                };

                /**/
                self.cardViewDataSource = ko.computed(function () {
                    return self.cardViewPagingDataSource().getWindowObservable();
                });
                //self.cardViewDataSource.extend({rateLimit: {timeout: 1000, method: "notifyWhenChangesStop"}});
                /**/

                //self.cardViewDataSource.extend({rateLimit : { timeout: 100, method: "notifyWhenChangesStop"}});


                self.getPhoto = function (empId) {
                    var src;
                    if (empId < 188) {
                        src = 'css/images/people/' + empId + '.png';
                    } else {
                        src = 'css/images/people/nopic.png';
                    }
                    return src;
                };


                /**/
                self.getList = function (company) {
                    return company.doclist.docs[0].lis_name;
                };
                /**/
                /**/
                self.getName = function (company) {
                    //var name = company.doclist.docs[0].nam_comp_name;
                    //var name = self.allHighlighting()[company.doclist.docs[0].sse_id].nam_comp_name[0];
                    if (self.allPeople().grouped.ent_id.groups.length !== 0) {
                        var sse_id = self.allPeople().grouped.ent_id.groups[0].doclist.docs[0].sse_id;
                        var name = self.allPeople().highlighting[sse_id].nam_comp_name;
                    } else
                        var name = "";
                    return name;
                };
                /**/
                /**/
                self.getPercentage = function (company) {
                    var value = company.doclist.docs[0].score * 100 + "";
                    var percentage = value.substring(0, 5) + "%";
                    return percentage;
                };
                /**/
                /**/
                self.getPercentageColor = function (company) {
                    var percentage = company.doclist.docs[0].score * 100;
                    return percentage;
                };
                /**/
                /**/
                self.getHits = function (company) {
                    var matches;
                    if (self.allPeople().grouped.ent_id.groups.length !== 0)
                        matches = "Hits: " + company.doclist.numFound;
                    else
                        matches = "";
                    return matches;
                };
                /**/
                /**/
                self.getCountry = function (company) {
                    var country;
                    if (company.doclist.docs[0].add_country)
                        country = "'" + company.doclist.docs[0].add_country + "'";
                    else
                        country = "worldwide";
                    return country;
                };
                /**/
                /**/
                self.getAddress = function (company) {
                    var city;
                    if (company.doclist.docs[0].add_city)
                        city = company.doclist.docs[0].add_city;
                    else
                        city = "";

                    var street;
                    if (company.doclist.docs[0].add_street)
                        street = ", " + company.doclist.docs[0].add_street;
                    else
                        street = "";

                    var zipcode;
                    if (company.doclist.docs[0].add_zipcode)
                        zipcode = ", " + company.doclist.docs[0].add_zipcode;
                    else
                        zipcode = "";

                    var address;
                    address = city + street + zipcode;
                    if (!address)
                        address = "without address";
                    return address;
                };
                /**/
                /**/
                self.getNumberMatches = function (company) {
                    var matches;
                    if (self.allPeople().grouped.ent_id.groups.length !== 0)
                        matches = self.allPeople().grouped.ngroups;
                    else
                        matches = 0;
                    return matches;
                };
                /**/




                /**
                 self.loadPersonPage = function (emp) {
                 if (emp.empId) {
                 // Temporary code until go('person/' + emp.empId); is checked in 1.1.2
                 history.pushState(null, '', 'index.html?root=person&emp=' + emp.empId);
                 oj.Router.sync();
                 } else {
                 // Default id for person is 100 so no need to specify.
                 oj.Router.rootInstance.go('person');
                 }
                 };
                 /**/

                /**/
                self.loadPersonPage = function (comp) {
                    if (comp.sse_id) {
                        // Temporary code until go('person/' + emp.empId); is checked in 1.1.2
                        history.pushState(null, '', 'index.html?root=person&comp=' + comp.sse_id);
                        oj.Router.sync();
                    } else {
                        // Default id for person is 100 so no need to specify.
                        oj.Router.rootInstance.go('person');
                    }
                };
                /**/



            }

            return PeopleViewModel;
        });
