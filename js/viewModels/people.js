/* global interact */

/**
 * Copyright (c) 2014, 2016, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */
define(['ojs/ojcore', 'knockout', 'utils', 'jquery', 'ojs/ojrouter', 'ojs/ojknockout', 'promise', 'ojs/ojlistview',
    'ojs/ojmodel', 'ojs/ojpagingcontrol', 'ojs/ojpagingcontrol-model', 'ojs/ojbutton', 'ojs/ojtreemap', 'ojs/ojtree', 'libs/jsTree/jstree',
    'ojs/ojselectcombobox', 'ojs/ojjsontreedatasource', 'ojs/ojdialog', 'ojs/ojinputnumber', 'jquery-ui'],
        function (oj, ko, utils, $)
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
                self.url = ko.observable('/solr/CoreOne/select?indent=on&wt=json');
                self.start = ko.observable(0);
                self.rows = ko.observable(20);
                self.highlightField = ko.observable('&hl.fl=nam_comp_name&hl.simple.pre=<span class="highlight">&hl.simple.post=</span>&hl=on');
                self.groupField = ko.observable('&group.cache.percent=100&group.field=ent_id&group.ngroups=true&group.truncate=true&group=true');
                self.facetField = ko.observable('&facet.field=add_country&facet.field=lis_name&facet=on');
                self.scoreField = ko.observable('&fl=*,score');
                //self.wordPercentage = ko.observable('')
                self.queryField = ko.observable('&q={!percentage t=QUERY_SIDE f=nam_comp_name}');
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
                self.noResults.extend({rateLimit: {timeout: 100, method: "notifyWhenChangesStop"}});

                //for the advanced Menu
                //for the word percentage
                self.wordPercentage = ko.observable(80);
                self.step = ko.observable(10);
                self.setInputWordPerNumberValueTo80 = function ()
                {
                    self.wordPercentage(80);
                };
                //For the phrase percentage
                self.phrasePercentage = ko.observable(80);
                self.step = ko.observable(10);
                self.setInputPhrasePerNumberValueTo80 = function ()
                {
                    self.phrasePercentage(80);
                };
                self.fqTotalPercentage = ko.observable("");
                //For the score algorithm
                self.scoreAlgorithm = ko.observable("QUERY_SIDE");
                //For the words distance algorithm
                self.wordsDistanceAlgorithm = ko.observable("DA_LV");

                

                //self.filterTreeObs.extend({rateLimit: {timeout: 300, method: "notifyWhenChangesStop"}});

                /************************************** FILTER FUNCTION ***********************************************************/

                //limit the retrieve data for every search input
                self.nameSearch.extend({rateLimit: {timeout: 300, method: "notifyWhenChangesStop"}});

                //Temporary solution to start the Advance Search Dialog
                self.nameSearch(" ");
                var starting = true;

                //for counting the number of the page
                self.numberPage = ko.observable();
                
                // Retrieve data from SOLR for the tree filter
                self.nameQ = ko.observable("");
                self.oneTimeRetrieveSolrTree = true;
                self.getSolrDataTree = function () {
                    $.getJSON(
                            self.url().toString() + "&rows=0" +
                            self.groupField().toString() +
                            self.facetField().toString() + self.fqTotalPercentage() +
                            self.queryField().toString() +
                            self.nameQ()).then(function (people) {
                        self.facetsCountries(people.facet_counts.facet_fields.add_country);
                        self.facetsLists(people.facet_counts.facet_fields.lis_name);
                    }).fail(function (error) {
                        console.log('Error in getting People data: ' + error.message);
                    });
                };

                //Live scroll variables
                var stopScroll = false;
                var firstPage = true;
                
                self.nameSearch.subscribe(function (newValue) {
                    $("#searchedItemsContainer").scrollTop(0);
                    self.start(0);
                    self.rows(40);
                    if(self.nameSearch().search(/\w/) !== -1){
                        firstPage = true;
                        self.numberPage("");
                    }
                        
                    
//                    if(self.nameSearch().search(/\w/) !== -1  &&  self.filteredAllPeople().length > 12)
//                        self.numberPage(1);
//                    else self.numberPage("");
                });


                self.filteredAllPeople = ko.pureComputed(function () {
                    var peopleFilter = new Array();

                    //set the position of the filter tree panels after returning from the details page
                    if (oj.Router.rootInstance.tx === "back") {
                        //$("#tree").css({'top': utils.resetTreesPos()[0].top, 'left' :utils.resetTreesPos()[0].left });
                        $("#tree").css({
                            "width": utils.resetTreesPos()[0].width,
                            "height": utils.resetTreesPos()[0].height,
                            "top": utils.resetTreesPos()[1].top,
                            "left": utils.resetTreesPos()[1].left
                        });

                        $("#treeList").css({
                            "width": utils.resetTreesPos()[2].width,
                            "height": utils.resetTreesPos()[2].height,
                            "top": utils.resetTreesPos()[3].top,
                            "left": utils.resetTreesPos()[3].left
                        });
                    }
                    //Reseting search input
                    if (self.nameSearch() === " " && !starting) {
                        self.nameSearch("");
                    }

                    if (self.nameSearch().search(/\w/) === -1) {
                        peopleFilter = [];
                        self.facetsCountries([""]);
                        self.facetsLists([""]);
                        self.numberMatches("");
                        self.noResults("");
                        self.nameQ("");
                        nameBeforeUpdate = "";
                        self.fqTotalPercentage("");
                        self.keepFilter = false;
                    } else {

                        if (self.nameSearch() !== nameBeforeUpdate || self.filterTreeObs() === "ready" || stopScroll === true) {

                            //For Live Scrolling it is needed the stopScroll to perform only one request
                            if (stopScroll) {
                                stopScroll = false;
                            }

                            if (self.filterTreeObs() === "done")
                                self.keepFilter = false;

                            if (self.filterTreeObs() === "ready")
                                self.keepFilter = true;

                            if (self.comboObservable() === "combobox")
                                if (self.comboboxSelectValue().length === 0)
                                    self.keepFilter = false;


                            //Facets Filter
                            var fqCountries = self.fq();
                            var fqLists = self.fqList();


                            var name = "";
                            /*** To replace the whitespaces with "~" *********/
                            name = self.nameSearch().replace(/$\s+/g, '~ ');
                            /*** To delete the whitespaces from the end of the words ***/
                            name = name.replace(/\s*$/, "");
                            /*** Add "~" for more than 3 chars ***/
                            if (name.length >= 3)
                                name = name + "~";
                            /*** Add "~" between words at spliting ***/
                            if (name.search(/\w\s/) !== -1)
                                name = name.replace(/\s+/g, "~ ");
                            /*** Remove multiple "~" ***/
                            name = name.replace(/\~+/g, '~');
                            /*** Remove from beginning of the string ***/
                            name = name.replace(/^~+/, "");
                            console.log("name Query: " + name);
                            if (fqCountries.search("undefined") !== -1)
                                fqCountries = "";



                            //Integrate the percentage values into the self.queryField()
                            var wordPercentage = "pw=" + "0." + self.wordPercentage().toString().substring(0, 2);
                            var phrasePercentage = "0." + self.phrasePercentage().toString().substring(0, 2);
                            self.queryField("&q={!percentage f=nam_comp_name" + " " + "t=" + self.scoreAlgorithm() + " " +
                                    wordPercentage + " " + "alg=" + self.wordsDistanceAlgorithm() + "}");
                            self.fqTotalPercentage("&fq={!frange l=" + phrasePercentage + " " + "}query($q)");
                            if (name === "" || name === " ")
                                self.fqTotalPercentage("");

                            self.nameQ(name);

                            $.getJSON(
                                    self.url().toString() + '&start=' + self.start() + '&rows=' + self.rows() +
                                    self.highlightField().toString() +
                                    self.groupField().toString() +
                                    self.scoreField().toString() + fqCountries + fqLists + self.fqTotalPercentage() +
                                    self.queryField().toString() +
                                    name).then(function (people) {
                                self.allPeople(people);
                                self.allHighlighting(people.highlighting);
                                //self.facetsCountries(people.facet_counts.facet_fields.add_country);
                                //self.facetsLists(people.facet_counts.facet_fields.lis_name);
                                self.numberMatches(people.grouped.ent_id.ngroups + " Hits");
                                //self.oneTimeRetrieveSolrTree = true;

                                if (self.numberMatches() === "0 Hits") {
                                    self.noResults("No Results");
                                    self.numberPage("");
                                } else if (self.numberMatches() !== "0 Hits") {
                                    self.noResults("");
                                }

                            }).fail(function (error) {
                                console.log('Error in getting People data: ' + error.message);
                            });

                            self.filterTreeObs("done");
                            self.comboObservable("done");
                            nameBeforeUpdate = self.nameSearch();


                            self.getSolrDataTree();
                            //self.oneTimeRetrieveSolrTree = false;
                        }

                        if (self.allPeople().grouped !== undefined)
                            peopleFilter = self.allPeople().grouped.ent_id.groups;

                    }



                    //console.log(self.comboboxSelectValue());

                    //if (self.allPeople().grouped !== undefined)
                    //self.numberMatches(self.allPeople().grouped.ent_id.ngroups);
                    starting = false;
                    self.ready(true);
                    return peopleFilter;
                });

                

                //self.filteredAllPeople.extend({rateLimit: {timeout: 200, method: "notifyWhenChangesStop"}});


                self.getNodeDataCountry = function (node, fn) {
                    fn(self.workerResult());
                };

                self.getNodeDataList = function (node, fn) {
                    //Something to shorten the list title                    
//                    if(self.workerListResult().length !== 0)
//                    if(self.workerListResult()[0].children !== undefined)
//                    for (var i = 0; i < self.workerListResult()[0].children.length; ++i){
//                        var title = self.workerListResult()[0].children[i].title;
//                        var trim = title.substring(0, 10) + "..." + title.substring(title.indexOf(","), title.length);
//                        self.workerListResult()[0].children[i].title = trim;
//                    }
                    fn(self.workerListResult());
                };




                /*/
                 self.listViewDataSource = ko.computed(function () {
                 return new oj.ArrayTableDataSource(self.filteredAllPeople(), {idAttribute: 'empId'});
                 });
                 /**/

                /**/
                
                self.cardViewPagingDataSource = ko.pureComputed(function () {
                    var earlyFilteredPeoplee;
                    var lastScrollTop = 0;
                    var scrollTimer, lastScrollFireTime = 0;
                    
                    //For the Live Scroll
                    $("#searchedItemsContainer").scroll(function (event) {
                        
                        var minScrollTime = 600;
                        var now = new Date().getTime();
                        
                        function processScroll() {
                            if ($("#searchedItemsContainer").scrollTop() > lastScrollTop) {
                                //Scroll Downward
                                if (self.allPeople().grouped.ent_id.ngroups > self.start() + 40) {
                                    if(firstPage){
                                        self.numberPage(1);
                                        firstPage = false;
                                    }
                                    if ($("#searchedItemsContainer").scrollTop() + $("#searchedItemsContainer").innerHeight() >= $("#searchedItemsContainer")[0].scrollHeight) {
                                        stopScroll = true;
                                        self.start(self.start() + 24);
                                        event.preventDefault();
                                        event.stopPropagation();
                                        self.filterTreeObs("scrolling");
                                        $("#searchedItemsContainer").scrollTop(($("#searchedItemsContainer")[0].scrollHeight / 1.6)-$("#searchedItemsContainer").innerHeight());
                                        scrollPointDown = 0;
                                        self.numberPage(self.numberPage()+1);    
                                    }
                                }
//                                if($("#searchedItemsContainer").scrollTop()>scrollPointDown){
//                                    if(scrollPointDown !== 0){
//                                        scrollPointDown = scrollPointDown*2;
//                                        self.numberPage(self.numberPage()+1);
//                                    }
//                                }
                            } else {
                                //Scroll Upward
                                if ($("#searchedItemsContainer").scrollTop() <= 0 && self.start() >= 24) {
                                    stopScroll = true;
                                    if (self.start() > 24) {
                                        self.start(self.start() - 24);
                                        $("#searchedItemsContainer").scrollTop(($("#searchedItemsContainer")[0].scrollHeight / 1.6)-$("#searchedItemsContainer").innerHeight());
                                        self.numberPage(self.numberPage()-1);
                                    }
                                    else if (self.start() === 24) {
                                        self.start(0);
                                        $("#searchedItemsContainer").scrollTop(($("#searchedItemsContainer")[0].scrollHeight / 1.6)-$("#searchedItemsContainer").innerHeight());
                                        self.numberPage(1);
                                    }
                                    event.preventDefault();
                                    event.stopPropagation();
                                    self.filterTreeObs("scrolling downwards");
                                    
                                }
//                                if($("#searchedItemsContainer").scrollTop() < ($("#searchedItemsContainer")[0].scrollHeight - scrollPointUp)){
//                                    scrollPointUp = scrollPointUp*2;
//                                    self.numberPage(self.numberPage()-1);
//                                }
                            }
                            lastScrollTop = $("#searchedItemsContainer").scrollTop();
                        }

                        if (!scrollTimer) {
                            if (now - lastScrollFireTime > (3 * minScrollTime)) {
                                processScroll();   // fire immediately on first scroll
                                lastScrollFireTime = now;
                            }
                            scrollTimer = setTimeout(function () {
                                scrollTimer = null;
                                lastScrollFireTime = new Date().getTime();
                                processScroll();
                            }, minScrollTime);
                        }

                    });

                    //start the Advanced Search Dialog
                    self.handleOpen = $("#buttonOpener").click(function () {
                        $("#modalDialog1").ojDialog("open");
                        event.stopImmediatePropagation();
                    });

                    self.handleOKClose = $("#okButton").click(function (event) {
                        $("#modalDialog1").ojDialog("close");
                        self.filterTreeObs("ready");
                        event.stopImmediatePropagation();
                        self.keepFilter = false;
                    });
                    if (earlyFilteredPeoplee !== undefined)
                        //allFiltered.push(self.filteredAllPeople());
                        //self.filteredAllPeople().push(earlyFilteredPeople);
                        console.log("return oj.ArrayPagingDataSource");
                    return new oj.ArrayPagingDataSource((self.filteredAllPeople()));
                });

                //Used for the live scrolling, among other uses. It is needed some time to process the data in order to visualize it.
                self.cardViewPagingDataSource.extend({rateLimit: {timeout: 10, method: "notifyWhenChangesStop"}});

                self.cardViewPagingDataSource.subscribe(function (newValue) {
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
                            }
                        }
                        event.stopImmediatePropagation();
                    });

                    /*
                     * Filter Tree Panels interaction
                     */

                    $(function () {
                        $("#tree").draggable().resizable({
                            minHeight: 40,
                            minWidth: 200,
                            animate: true
                        });
                        $("#treeList").draggable().resizable({
                            minHeight: 40,
                            minWidth: 200,
                            animate: true
                        });
                    });

                    // target elements with the "draggable" class
//                    interact('#tree')
//                            .draggable({
//                                // ***changed line 65 from interact.js so the cursor on hovering will not change
//                                // enable inertial throwing
//                                inertia: true,
//                                // keep the element within the area of it's parent
//                                restrict: {
//                                    restriction: "#topDiv",
//                                    endOnly: true,
//                                    elementRect: {top: 0, left: 0, bottom: 1, right: 1}
//                                },
//                                // call this function on every dragmove event
//                                onmove: dragMoveListener
//                            }).resizable({
//                        margin: 37,
//                        edges: {left: false, right: true, bottom: true, top: false}
//                    }).on('resizemove', function (event) {
//                        var target = event.target,
//                                x = (parseFloat(target.getAttribute('data-x')) || 0),
//                                y = (parseFloat(target.getAttribute('data-y')) || 0);
//
//
//                        if (event.rect.width > 77 && event.rect.height > 30) {
//                            // update the element's style
//                            target.style.width = event.rect.width + 'px';
//                            target.style.height = event.rect.height + 'px';
//
//                            // translate when resizing from top or left edges
//                            x += event.deltaRect.left;
//                            y += event.deltaRect.top;
//
//                            target.style.webkitTransform = target.style.transform = 'translate(' + x + 'px,' + y + 'px)';
//
//                            target.setAttribute('data-x', x);
//                            target.setAttribute('data-y', y);
//                        }
//                    });
//                    
//                    function dragMoveListener(event) {
//                        var target = event.target,
//                                // keep the dragged position in the data-x/data-y attributes
//                                x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
//                                y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
//
//                        // translate the element
//                        target.style.webkitTransform = target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
//
//                        // update the posiion attributes
//                        target.setAttribute('data-x', x);
//                        target.setAttribute('data-y', y);
//                    }

                    /*
                     * End of interaction
                     */

                    $('#tree').on("ojcollapse", function (e, ui) {
                        if (oj.Router.rootInstance.tx !== "back")
                        $("#tree").css({"height": 40});
                        e.stopImmediatePropagation();
                    });
                    $('#tree').on("ojexpand", function (e, ui) {
                        if (oj.Router.rootInstance.tx !== "back")
                        $("#tree").css({"height": 220});
                        e.stopImmediatePropagation();
                    });
                    $('#treeList').on("ojcollapse", function (e, ui) {
                        if (oj.Router.rootInstance.tx !== "back")
                        $("#treeList").css({"height": 40});
                        e.stopImmediatePropagation();
                    });
                    $('#treeList').on("ojexpand", function (e, ui) {
                        if (oj.Router.rootInstance.tx !== "back")
                        $("#treeList").css({"height": 220});
                        e.stopImmediatePropagation();
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
                            if (filterValue !== "List" && filterValue !== undefined && filterValue !== "") {
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
                    
                });
                /**/


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
                self.cardViewDataSource = ko.pureComputed(function () {
                    return self.cardViewPagingDataSource().getWindowObservable();
                });
                /**/

                //Mainly used for the Live Scroll. It is needed to wait time before visualizing the information
                self.cardViewDataSource.extend({rateLimit: {timeout: 200, method: "notifyWhenChangesStop"}});

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
                        var sse_id = company.doclist.docs[0].sse_id;
                        if (self.allPeople().highlighting[sse_id] !== undefined)
                            var name = self.allPeople().highlighting[sse_id].nam_comp_name;
                    } else
                        var name = "";
                    return name;
                };
                /**/
                /*/
                
                self.getNumberEntity = function (company) {
                    var number = self.allPeople().grouped.ent_id.groups.indexOf(company)+1;
                    
                    return number;
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


                //To load the details page when click on an entity
                self.loadPersonPage = function (comp) {
                    if (comp.doclist.docs[0].ent_id) {
                        id = comp.doclist.docs[0].ent_id;
                        // Temporary code until go('person/' + emp.empId); is checked in 1.1.2
                        history.pushState(null, '', 'index.html?root=details&ent_id=' + id);
                        oj.Router.sync();
                        utils.rememberState(self.nameSearch(), self.filterTree(), self.filterTreeList());
                        //Store the position of the Filter Tree Panels
                        var sizeTreeCountry = $("#tree").css(["width", "height"]);
                        var posTreeCountry = $("#tree").position();
                        var sizeTreeList = $("#treeList").css(["width", "height"]);
                        var posTreeList = $("#treeList").position();
                        utils.rememberPositionTrees(sizeTreeCountry, posTreeCountry, sizeTreeList, posTreeList);
                    }

                };

                //To establish the previous state after returning from details page
                if (oj.Router.rootInstance.tx === "back") {
                    self.filterTree(utils.resetState()[1]);
                    self.filterTreeList(utils.resetState()[2]);
                    self.processFilterCountries();
                    self.processFilterLists();
                    self.filterTreeObs("done");
                    self.nameSearch(utils.resetState()[0]);
                }

            }
            return PeopleViewModel;
        });
