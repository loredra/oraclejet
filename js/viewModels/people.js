/* global interact, german, english */

/**
 * Copyright (c) 2014, 2016, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */
define(['ojs/ojcore', 'knockout', 'utils', 'jquery', 'jstree', 'lang/lang.ge', 'lang/lang.en', 'lang/lang.fr', 'ojs/ojrouter', 'ojs/ojknockout', 'promise', 'ojs/ojlistview',
    'ojs/ojmodel', 'ojs/ojpagingcontrol', 'ojs/ojpagingcontrol-model', 'ojs/ojbutton', 'ojs/ojtreemap', 'ojs/ojtree', 'libs/jsTree/jstree',
    'ojs/ojselectcombobox', 'ojs/ojjsontreedatasource', 'ojs/ojdialog', 'ojs/ojinputnumber', 'jquery-ui', 'knockout-postbox'],
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
                self.url = ko.observable('/solr/EntityCore/select?indent=on&wt=json');
                self.start = ko.observable(0);
                self.rows = ko.observable(20);
                self.highlightField = ko.observable('&hl.fl=nam_comp_name&hl.simple.pre=<span class="highlight">&hl.simple.post=</span>&hl=on');
                self.groupField = ko.observable('&group.cache.percent=100&group.field=ent_id&group.ngroups=true&group.truncate=true&group=true');
                self.facetField = ko.observable('&facet.field=add_country&facet.field=program_number&facet.field=ent_typeTree&facet=on');
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
                self.facetsTypes = ko.observableArray([]);

                //variables to control data requests
                var nameBeforeUpdate = '';

                //Observable array for the filter tree
                self.filterTree = ko.observableArray([]);
                self.fq = ko.observable("");
                self.filterTreeList = ko.observableArray([]);
                self.fqList = ko.observable("");
                self.filterTreeType = ko.observableArray([]);
                self.fqType = ko.observable("");
                //Observable for the comunication from the selection function "filteredAllPeople" to tree change events
                self.filterTreeObs = ko.observable("");

                //data tree observable array
                self.dataTree = ko.observableArray([]);

                //control access to tree method
                self.treeInit = ko.observable("");

                //nodes for OJ Tree
                self.nodeTreeCountry = ko.observableArray([]);
                self.nodeTreeList = ko.observableArray([]);

                //trees filter variables for remembering size
                self.treeHeight = ko.observable();
                self.treeListHeight = ko.observable();

                //Observable array for the filter to apear on the combobox when it is selcted
                self.comboboxSelectValue = ko.observable([]);
                self.comboObservable = ko.observable("");
                //Observable array to transport filter information from the tree change event to valueChangeHandleCombobox function
                self.arrSelCheckbox = ko.observableArray([]);

                //workers
                self.worker = new Worker('js/viewModels/worker.js');
                self.workerList = new Worker('js/viewModels/workerList.js');
                self.workerType = new Worker('js/viewModels/workerType.js');

                //store the worker result
                self.workerResult = ko.observableArray([]);
                self.workerListResult = ko.observableArray([]);
                self.workerTypeResult = ko.observableArray([]);

                //something temporary for the expand feature of the tree
                var treeExpanded = false;

                self.searched = ko.observableArray([]);

                self.keepFilter = false;

                //a ko observable to display the number of hits
                self.hitsText = ko.observable("results")
                self.hitsValue = ko.observable();
                self.numberMatches = ko.observable("");

                //a ko observable to display when there are no results
                self.noResults = ko.observable("");
                self.noResults.extend({rateLimit: {timeout: 100, method: "notifyWhenChangesStop"}});

                //For the number of entities found in one group
                self.found = ko.observable("Found");
                self.entities = ko.observable("Entities");

                //
                //For the Advanced Menu
                //

                //Default definition for Advanced Search Observables 
                self.advancedSearchTitle = ko.observable("Advanced Search");
                self.defaultButton = ko.observable("Default");
                //For the Word Percentage Text
                self.wordPercentageText = ko.observable("Word Percentage");
                //self.wordPercentageDefinition = ko.observable('The minimum percentage value of an word to accept a match');//this is for the help def
                //For the Word Percentage Value
                self.wordPercentage = ko.observable(80);
                self.step = ko.observable(10);
                self.setInputWordPerNumberValueTo80 = function ()
                {
                    self.wordPercentage(80);
                };
                //For the Phrase Percentage Text
                self.phrasePercentageText = ko.observable("Phrase Percentage");
                //self.phrasePercentageDefinition = ko.observable('The minimum total percentage to accept a string (multiple words) as a match. Score must be higher than this value.');//this is for the help def
                //For the Phrase Percentage Value
                self.phrasePercentage = ko.observable(80);
                self.step = ko.observable(10);
                self.setInputPhrasePerNumberValueTo80 = function ()
                {
                    self.phrasePercentage(80);
                };
                self.fqTotalPercentage = ko.observable("");
                //For the Score Algorithm Text
                self.scoreAlgorithmText = ko.observable("Score Algorithm");
                //self.scoreAlgorithmDefinition = ko.observable('Algorithms for the score.');//this is for the help def
                //For the Score Algorithm Value
                self.scoreAlgorithm = ko.observable("QUERY_SIDE");
                //For the Words Distance Algorithm Text
                self.wordsDistanceAlgorithmText = ko.observable("Words Distance Algorithm");
                //self.wordsDistanceAlgorithmDefinition = ko.observable("Defines which algorithm must be used to calculate the distance between words");//this is for the help def
                //For the Words Distance Algorithm Value
                self.wordsDistanceAlgorithm = ko.observable("DA_LV");

                //
                //Bindings for the Languages
                //
                var countryFilterPanelTitle = "Country";
                var listFilterPanelTitle = "List";
                var typeFilterPanelTitle = "Type";
                self.percentageText = ko.observable("Percentage");
                self.countryText = ko.observable("Country");
                self.addressStatus = ko.observable("without address");
                self.countryStatus = ko.observable("worldwide");

                //Variable in order to specify to not translate the search page when the user is inside details page
                var translate = true;

                self.languageSel = ko.observable("");
                self.languageSel.subscribeTo('languagesSearchPage');

                self.languageSel.subscribe(function (selectedLanguage) {
                    if (translate) {
                        if (selectedLanguage === "german") {
                            //Translate search input placeholder
                            $('#searchText').attr("placeholder", german.searchPage.basic.search);
                            //Translate tree panels
                            $("#tree").children().children().children().children(".oj-tree-title").text(german.searchPage.basic.country);
                            $("#treeList").children().children().children().children(".oj-tree-title").text(german.searchPage.basic.list);
                            self.workerResult()[0].title = german.searchPage.basic.country;
                            self.workerListResult()[0].title = german.searchPage.basic.list;
                            countryFilterPanelTitle = german.searchPage.basic.country;
                            listFilterPanelTitle = german.searchPage.basic.list;
                            //Translate Advanced Search
                            self.advancedSearchTitle(german.searchPage.advancedSearch.title);
                            self.defaultButton(german.searchPage.advancedSearch.defaultButton);
                            self.wordPercentageText(german.searchPage.advancedSearch.wordPercentage.text);
                            self.phrasePercentageText(german.searchPage.advancedSearch.phrasePercentage.text);
                            self.scoreAlgorithmText(german.searchPage.advancedSearch.scoreAlgorithm.text);
                            self.wordsDistanceAlgorithmText(german.searchPage.advancedSearch.wordsDistanceAlgorithm.text);
                            //Translate Number Of Hits
                            self.hitsText(german.searchPage.hits);
                            self.numberMatches(self.hitsValue() + " " + self.hitsText());
                            //Translate Searched Entities Properties 
                            self.percentageText(german.searchPage.searchedEntityProperty.percentage);
                            self.countryText(german.searchPage.searchedEntityProperty.country);
                            self.addressStatus(german.searchPage.searchedEntityProperty.addressStatus);
                            self.countryStatus(german.searchPage.searchedEntityProperty.countryStatus);
                            self.found(german.searchPage.searchedEntityProperty.found);
                            self.entities(german.searchPage.searchedEntityProperty.entities);
                        } else if (selectedLanguage === "english") {
                            //Translate search input placeholder
                            $('#searchText').attr("placeholder", english.searchPage.basic.search);
                            //Translate tree panels
                            $("#tree").children().children().children().children(".oj-tree-title").text(english.searchPage.basic.country);
                            $("#treeList").children().children().children().children(".oj-tree-title").text(english.searchPage.basic.list);
                            self.workerResult()[0].title = english.searchPage.basic.country;
                            self.workerListResult()[0].title = english.searchPage.basic.list;
                            countryFilterPanelTitle = english.searchPage.basic.country;
                            listFilterPanelTitle = english.searchPage.basic.list;
                            //Translate Advanced Search
                            self.advancedSearchTitle(english.searchPage.advancedSearch.title);
                            self.defaultButton(english.searchPage.advancedSearch.defaultButton);
                            self.wordPercentageText(english.searchPage.advancedSearch.wordPercentage.text);
                            self.phrasePercentageText(english.searchPage.advancedSearch.phrasePercentage.text);
                            self.scoreAlgorithmText(english.searchPage.advancedSearch.scoreAlgorithm.text);
                            self.wordsDistanceAlgorithmText(english.searchPage.advancedSearch.wordsDistanceAlgorithm.text);
                            //Translate Number Of Hits
                            self.hitsText(english.searchPage.hits);
                            self.numberMatches(self.hitsValue() + " " + self.hitsText());
                            //Translate Searched Entities Properties
                            self.percentageText(english.searchPage.searchedEntityProperty.percentage);
                            self.countryText(english.searchPage.searchedEntityProperty.country);
                            self.addressStatus(english.searchPage.searchedEntityProperty.addressStatus);
                            self.countryStatus(english.searchPage.searchedEntityProperty.countryStatus);
                            self.found(english.searchPage.searchedEntityProperty.found);
                            self.entities(english.searchPage.searchedEntityProperty.entities);
                        } else if (selectedLanguage === "french") {
                            //Translate search input placeholder
                            $('#searchText').attr("placeholder", french.searchPage.basic.search);
                            //Translate tree panels
                            $("#tree").children().children().children().children(".oj-tree-title").text(french.searchPage.basic.country);
                            $("#treeList").children().children().children().children(".oj-tree-title").text(french.searchPage.basic.list);
                            self.workerResult()[0].title = french.searchPage.basic.country;
                            self.workerListResult()[0].title = french.searchPage.basic.list;
                            countryFilterPanelTitle = french.searchPage.basic.country;
                            listFilterPanelTitle = french.searchPage.basic.list;
                            //Translate Advanced Search
                            self.advancedSearchTitle(french.searchPage.advancedSearch.title);
                            self.defaultButton(french.searchPage.advancedSearch.defaultButton);
                            self.wordPercentageText(french.searchPage.advancedSearch.wordPercentage.text);
                            self.phrasePercentageText(french.searchPage.advancedSearch.phrasePercentage.text);
                            self.scoreAlgorithmText(french.searchPage.advancedSearch.scoreAlgorithm.text);
                            self.wordsDistanceAlgorithmText(french.searchPage.advancedSearch.wordsDistanceAlgorithm.text);
                            //Translate Number Of Hits
                            self.hitsText(french.searchPage.hits);
                            self.numberMatches(self.hitsValue() + " " + self.hitsText());
                            //Translate Searched Entities Properties
                            self.percentageText(french.searchPage.searchedEntityProperty.percentage);
                            self.countryText(french.searchPage.searchedEntityProperty.country);
                            self.addressStatus(french.searchPage.searchedEntityProperty.addressStatus);
                            self.countryStatus(french.searchPage.searchedEntityProperty.countryStatus);
                            self.found(french.searchPage.searchedEntityProperty.found);
                            self.entities(french.searchPage.searchedEntityProperty.entities);
                        }
                    }
                });

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
                        self.facetsLists(people.facet_counts.facet_fields.program_number);
                        self.facetsTypes(people.facet_counts.facet_fields.ent_typeTree);
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
                    if (self.nameSearch().search(/\w/) !== -1) {
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
                            var fqType = self.fqType();


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
                                    self.scoreField().toString() + fqCountries + fqLists + fqType + self.fqTotalPercentage() +
                                    self.queryField().toString() +
                                    name).then(function (people) {
                                self.allPeople(people);
                                self.allHighlighting(people.highlighting);
                                //self.facetsCountries(people.facet_counts.facet_fields.add_country);
                                //self.facetsLists(people.facet_counts.facet_fields.lis_name);
                                self.hitsValue(people.grouped.ent_id.ngroups);
                                self.numberMatches(self.hitsValue() + " " + self.hitsText());
                                //self.oneTimeRetrieveSolrTree = true;

                                if (self.hitsValue() === 0) {
                                    self.noResults("No Results");
                                    self.numberPage("");
                                } else if (self.hitsValue() !== 0) {
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

                self.getNodeDataType = function (node, fn) {
                    fn(self.workerTypeResult());
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
                                    if (firstPage) {
                                        self.numberPage(1);
                                        firstPage = false;
                                    }
                                    if ($("#searchedItemsContainer").scrollTop() + $("#searchedItemsContainer").innerHeight() >= $("#searchedItemsContainer")[0].scrollHeight) {
                                        stopScroll = true;
                                        self.start(self.start() + 24);
                                        event.preventDefault();
                                        event.stopPropagation();
                                        self.filterTreeObs("scrolling");
                                        $("#searchedItemsContainer").scrollTop(($("#searchedItemsContainer")[0].scrollHeight / 1.6) - $("#searchedItemsContainer").innerHeight());
                                        scrollPointDown = 0;
                                        self.numberPage(self.numberPage() + 1);
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
                                        $("#searchedItemsContainer").scrollTop(($("#searchedItemsContainer")[0].scrollHeight / 1.6) - $("#searchedItemsContainer").innerHeight());
                                        self.numberPage(self.numberPage() - 1);
                                    } else if (self.start() === 24) {
                                        self.start(0);
                                        $("#searchedItemsContainer").scrollTop(($("#searchedItemsContainer")[0].scrollHeight / 1.6) - $("#searchedItemsContainer").innerHeight());
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
                    $('#treeCountryLib').jstree({
                        "core": {
                            "themes": {
                                "variant": "large"
                            }
                        },
                        "plugins": ["wholerow", "checkbox"]
                    });
                    $('#treeListLib').jstree({
                        "core": {
                            "themes": {
                                "variant": "large"
                            }
                        },
                        "plugins": ["wholerow", "checkbox"]
                    });
                    $('#treeTypeLib').jstree({
                        "core": {
                            "themes": {
                                "variant": "large"
                            }
                        },
                        "plugins": ["wholerow", "checkbox"]
                    });

                    if (self.keepFilter === false) {
                        self.worker.postMessage(self.facetsCountries());
                        self.worker.onmessage = function (m) {
                            m.data[0].title = countryFilterPanelTitle;
                            self.workerResult(m.data);
                            $('#tree').ojTree("refresh");
                            $('#tree').ojTree("expandAll");
                            $('#treeCountryLib').jstree(true).settings.core.data = self.workerResult();
                            $('#treeCountryLib').jstree(true).refresh();
                        };
                        self.workerList.postMessage(self.facetsLists());
                        self.workerList.onmessage = function (m) {
                            m.data[0].title = listFilterPanelTitle;
                            self.workerListResult(m.data);
                            $('#treeList').ojTree("refresh");
                            $('#treeList').ojTree("expandAll");
                            $('#treeListLib').jstree(true).settings.core.data = self.workerListResult();
                            $('#treeListLib').jstree(true).refresh();
                        };
                        self.workerType.postMessage(self.facetsTypes());
                        self.workerType.onmessage = function (m) {
                            //m.data[0].title = typeFilterPanelTitle;
                            self.workerTypeResult(m.data);
                            $('#treeType').ojTree("refresh");
                            $('#treeType').ojTree("expandAll");

                            var data = [
                                {"id": "ajson1", "parent": "#", "text": "Simple root node"},
                                {"id": "ajson2", "parent": "#", "text": "Root node 2"},
                                {"id": "ajson3", "parent": "ajson2", "text": "Child 1"},
                                {"id": "ajson4", "parent": "ajson2", "text": "Child 2"},
                            ]
                            $('#treeTypeLib').jstree(true).settings.core.data = self.workerTypeResult();
                            $('#treeTypeLib').jstree(true).refresh();
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
                            //To see which value is removed from the combobox, a value from the country or from list or from type
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
                            var isType = self.filterTreeType().find(function (el) {
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
                                $("#treeCountryLib").jstree("deselect_node", selected);
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
                                $("#treeListLib").jstree("deselect_node", selected);
                            }
                            if (isType !== undefined) {
                                var oldTreeType = self.filterTreeType();
                                var newTreeType = new Array();
                                $.grep(oldTreeType, function (el) {
                                    if ($.inArray(el, selected) === -1)
                                        newTreeType.push(el);
                                });
                                self.filterTreeType(newTreeType);
                                self.processFilterTypes();
                                $("#treeTypeLib").jstree("deselect_node", selected);

                            }
                        }
                        event.stopImmediatePropagation();
                    });

                    //
                    // Filter Tree Panels interaction
                    //
                    
                    $(function () {
                        $("#tree").draggable().resizable({
                        });
                        $("#treeList").draggable().resizable({
                        });
                        $("#treeType").draggable().resizable({
                        });
                        $("#treeCountryLibContainer").draggable().resizable();
                        $("#treeListLibContainer").draggable().resizable();
                        $("#treeTypeLibContainer").draggable().resizable();
                    });

                    $('#treeCountryLibContainer').on("ojcollapse", function (e, ui) {
                        self.treeHeight($("#treeCountryLibContainer").css("height"));
                        $("#treeCountryLibContainer").css({"height": 40});
                        e.stopImmediatePropagation();
                    });
                    $('#treeCountryLibContainer').on("ojexpand", function (e, ui) {
                        $("#treeCountryLibContainer").css({"height": self.treeHeight()});
                        e.stopImmediatePropagation();
                    });
                    $('#treeListLibContainer').on("ojcollapse", function (e, ui) {
                        self.treeListHeight($("#treeListLibContainer").css("height"));
                        $("#treeList").css({"height": 40});
                        e.stopImmediatePropagation();
                    });
                    $('#treeListLibContainer').on("ojexpand", function (e, ui) {
                        $("#treeListLibContainer").css({"height": self.treeListHeight()});
                        e.stopImmediatePropagation();
                    });
                    $('#treeTypeLibContainer').on("ojcollapse", function (e, ui) {
                        self.treeListHeight($("#treeList").css("height"));
                        $("#treeTypeLibContainer").css({"height": 40});
                        e.stopImmediatePropagation();
                    });
                    $('#treeTypeLibContainer').on("ojexpand", function (e, ui) {
                        $("#treeTypeLibContainer").css({"height": self.treeListHeight()});
                        e.stopImmediatePropagation();
                    });

                    //
                    // End of interaction
                    //


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
                            var text = $(ui.value).text();
                            if (text !== "") {
                                //Regex to find the position of the last coma
                                var match = (/,(?=[^,]*$)/).exec(text);
                                var pos = match.index;
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
                        }
                    });

                    $("#treeType").on("ojoptionchange", function (e, ui) {
                        if (ui.option === "selection") {
                            var filterValue = $(ui.value).attr("id");
                            if (filterValue !== "type" && filterValue !== undefined) {
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

                    $('#treeCountryLib').on('changed.jstree', function (e, data) {
                        if (data.action === "select_node") {
                            for (var c = 0; c < data.node.children_d.length + 1; ++c) {
                                if (c === data.node.children_d.length)
                                    var filterValue = data.node.id;
                                else
                                    var filterValue = data.node.children_d[c];
                                var foundDuplicate = self.filterTree().find(function (el) {
                                    var found = false;
                                    if (filterValue === el) {
                                        found = true;
                                    }
                                    return found;
                                });
                                if (foundDuplicate === undefined) {
                                    if(filterValue !== "country")
                                    self.filterTree().push(filterValue);
                                    self.keepFilter = true;
                                    self.filterTreeObs("load");
                                    self.processFilterCountries();
                                }
                            }
                        }
                        if (data.action === "deselect_node") {

                            for (var c = 0; c < data.node.children_d.length + 1; ++c) {
                                if (c === data.node.children_d.length)
                                    var filterValue = data.node.id;
                                else
                                    var filterValue = data.node.children_d[c];
                                var isType = self.filterTree().find(function (el) {
                                    return el === filterValue;
                                });
                                if (isType !== undefined) {
                                    var oldArray = self.filterTree();
                                    for (var i = 0; i < self.filterTree().length; i++) {
                                        if (filterValue === self.filterTree()[i])
                                            oldArray.splice(i, 1);
                                    }
                                    self.filterTree(oldArray);
                                    self.keepFilter = true;
                                    self.filterTreeObs("load");
                                    self.processFilterCountries();

                                }
                            }
                        }
                        e.stopImmediatePropagation();
                    });
                    
                    $('#treeListLib').on('changed.jstree', function (e, data) {
                        if (data.action === "select_node") {
                            for (var c = 0; c < data.node.children_d.length + 1; ++c) {
                                if (c === data.node.children_d.length)
                                    var filterValue = data.node.id;
                                else
                                    var filterValue = data.node.children_d[c];
                                var foundDuplicate = self.filterTreeList().find(function (el) {
                                    var found = false;
                                    if (filterValue === el) {
                                        found = true;
                                    }
                                    return found;
                                });
                                if (foundDuplicate === undefined) {
                                    if(filterValue !== "country")
                                    self.filterTreeList().push(filterValue);
                                    self.keepFilter = true;
                                    self.filterTreeObs("load");
                                    self.processFilterLists();
                                }
                            }
                        }
                        if (data.action === "deselect_node") {

                            for (var c = 0; c < data.node.children_d.length + 1; ++c) {
                                if (c === data.node.children_d.length)
                                    var filterValue = data.node.id;
                                else
                                    var filterValue = data.node.children_d[c];
                                var isType = self.filterTreeList().find(function (el) {
                                    return el === filterValue;
                                });
                                if (isType !== undefined) {
                                    var oldArray = self.filterTreeList();
                                    for (var i = 0; i < self.filterTreeList().length; i++) {
                                        if (filterValue === self.filterTreeList()[i])
                                            oldArray.splice(i, 1);
                                    }
                                    self.filterTreeList(oldArray);
                                    self.keepFilter = true;
                                    self.filterTreeObs("load");
                                    self.processFilterLists();

                                }
                            }
                        }
                        e.stopImmediatePropagation();
                    });
                    
                    $('#treeTypeLib').on('changed.jstree', function (e, data) {
                        if (data.action === "select_node") {
                            for (var c = 0; c < data.node.children_d.length + 1; ++c) {
                                if (c === data.node.children_d.length)
                                    var filterValue = data.node.id;
                                else
                                    var filterValue = data.node.children_d[c];
                                var foundDuplicate = self.filterTreeType().find(function (el) {
                                    var found = false;
                                    if (filterValue === el) {
                                        found = true;
                                    }
                                    return found;
                                });
                                if (foundDuplicate === undefined) {
                                    self.filterTreeType().push(filterValue);
                                    self.keepFilter = true;
                                    self.filterTreeObs("load");
                                    self.processFilterTypes();
                                }
                            }
                        }
                        if (data.action === "deselect_node") {

                            for (var c = 0; c < data.node.children_d.length + 1; ++c) {
                                if (c === data.node.children_d.length)
                                    var filterValue = data.node.id;
                                else
                                    var filterValue = data.node.children_d[c];
                                var isType = self.filterTreeType().find(function (el) {
                                    return el === filterValue;
                                });
                                if (isType !== undefined) {
                                    var oldArray = self.filterTreeType();
                                    for (var i = 0; i < self.filterTreeType().length; i++) {
                                        if (filterValue === self.filterTreeType()[i])
                                            oldArray.splice(i, 1);
                                    }
                                    self.filterTreeType(oldArray);
                                    self.keepFilter = true;
                                    self.filterTreeObs("load");
                                    self.processFilterTypes();
                                }
                            }
                        }
                        e.stopImmediatePropagation();
                    });

                    self.comboboxSelectValue(self.filterTree().concat(self.filterTreeList().concat(self.filterTreeType())));

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
                        fqList = "program_number:" + "\"" + self.filterTreeList()[0] + "\"";
                        for (var i = 1; i < self.filterTreeList().length; ++i) {
                            if (self.filterTreeList()[i] !== undefined)
                                fqList = fqList + " OR " + "program_number:" + "\"" + self.filterTreeList()[i] + "\"";
                        }
                        fqList = "&fq=" + fqList;
                    }
                    if (self.filterTreeList().length === 0)
                        fqList = "";
                    self.fqList(fqList);
                    self.filterTreeObs("ready");
                };

                //Process filter for Types
                self.processFilterTypes = function () {
                    var fqType = "";
                    if (self.filterTreeType().length > 0) {
                        fqType = "ent_type:" + "\"" + self.filterTreeType()[0] + "\"";
                        for (var i = 1; i < self.filterTreeType().length; ++i) {
                            if (self.filterTreeType()[i] !== undefined)
                                fqType = fqType + " OR " + "ent_type:" + "\"" + self.filterTreeType()[i] + "\"";
                        }
                        fqType = "&fq=" + fqType;
                    }
                    if (self.filterTreeType().length === 0)
                        fqType = "";
                    self.fqType(fqType);
                    self.filterTreeObs("ready");
                };

                /**/
                self.cardViewDataSource = ko.pureComputed(function () {
                    return self.cardViewPagingDataSource().getWindowObservable();
                });
                /**/

                //Mainly used for the Live Scroll. It is needed to wait time before visualizing the information
                self.cardViewDataSource.extend({rateLimit: {timeout: 200, method: "notifyWhenChangesStop"}});

                self.cardViewDataSource.subscribe(function (newValue) {
                    if (oj.Router.rootInstance.tx === "back") {
                        var language = utils.getLanguage().toString();
                        self.languageSel(language);
                    }
                });

                self.getPhoto = function (company) {
                    var src = 'js/views/resources/company.svg';
                    if (company.doclist.docs[0].ent_type === "ENTITY_INDIVIDUAL")
                        src = 'js/views/resources/human.svg';
                    else if (company.doclist.docs[0].ent_type === "ENTITY_COMPANY")
                        src = 'js/views/resources/company.svg';
                    else if (company.doclist.docs[0].ent_type === "ENTITY_BANK")
                        src = 'js/views/resources/bank.svg';
                    else if (company.doclist.docs[0].ent_type === "ENTITY_VESSEL")
                        src = 'js/views/resources/boat.svg';

                    return src;
                };

                self.getList = function (company) {
                    var listName;
                    if (company.doclist.docs[0].program_number === "null")
                        listName = "NO LIST";
                    else
                        listName = company.doclist.docs[0].program_number;
                    return listName;
                };

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

                /*/
                 
                 self.getNumberEntity = function (company) {
                 var number = self.allPeople().grouped.ent_id.groups.indexOf(company)+1;
                 
                 return number;
                 };
                 /**/

                self.getPercentage = function (company) {
                    var value = company.doclist.docs[0].score * 100 + "";
                    var percentage = value.substring(0, 5) + "%";
                    return percentage;
                };

                self.getPercentageColor = function (company) {
                    var percentage = company.doclist.docs[0].score * 100;
                    return percentage;
                };

                self.getHits = function (company) {
                    var matches;
                    if (self.allPeople().grouped.ent_id.groups.length !== 0)
                        matches = "Hits: " + company.doclist.numFound;
                    else
                        matches = "";
                    return matches;
                };

                self.getCountry = function (company) {
                    var country;
                    if (company.doclist.docs[0].add_country !== "null")
                        country = "'" + company.doclist.docs[0].add_country + "'";
                    else
                        country = this.countryStatus();
                    return country;
                };

                self.getAddress = function (company) {
                    var address = "";
                    //For the full address Solr field
                    if (company.doclist.docs[0].add_whole !== "null")
                        address = company.doclist.docs[0].add_whole;
                    else {
                        //For the streetaddress Solr field(up to city level)
                        if (company.doclist.docs[0].add_streetAddress !== "null")
                            address = company.doclist.docs[0].add_streetAddress;
                        else {
                            //room
                            var room = "";
                            if (company.doclist.docs[0].add_room !== "null")
                                room = company.doclist.docs[0].add_room;
                            //appartment
                            var appartment = "";
                            if (company.doclist.docs[0].add_appartment !== "null")
                                appartment = ", " + company.doclist.docs[0].add_appartment;
                            //floor
                            var floor = "";
                            if (company.doclist.docs[0].add_floor !== "null")
                                floor = ", " + company.doclist.docs[0].add_floor;
                            //building
                            var building = "";
                            if (company.doclist.docs[0].add_building !== "null")
                                building = ", " + company.doclist.docs[0].add_building;
                            //house
                            var house = "";
                            if (company.doclist.docs[0].add_house !== "null")
                                house = ", " + company.doclist.docs[0].add_house;
                            //street
                            var street = "";
                            if (company.doclist.docs[0].add_street !== "null")
                                street = ", " + company.doclist.docs[0].add_street;
                            //
                            //Address Result
                            //
                            address = room + appartment + building + house + street;
                        }
                        //district
                        var district = "";
                        if (company.doclist.docs[0].add_district !== "null")
                            district = ", " + company.doclist.docs[0].add_district;
                        //city
                        var city = "";
                        if (company.doclist.docs[0].add_city !== "null")
                            city = ", " + company.doclist.docs[0].add_city;
                        //zipcode
                        var zipCode = "";
                        if (company.doclist.docs[0].add_zipCode !== "null")
                            zipCode = ", " + company.doclist.docs[0].add_zipCode;
                        //state
                        var state = "";
                        if (company.doclist.docs[0].add_state !== "null")
                            state = ", " + company.doclist.docs[0].add_state;
                        //country
                        var country = "";
                        if (company.doclist.docs[0].add_country !== "null")
                            country = ", " + company.doclist.docs[0].add_country;
                        //
                        //Address Result
                        //
                        address = address + district + city + zipCode + state + country;
                    }
                    //delete if there is a comma at the begining of the address
                    address = address.replace(/^,/, '');
                    //delete if there is a comma at the end of the address
                    address = address.replace(/\,$/, "");
                    //show message for no found address
                    if (address === "")
                        address = this.addressStatus();
                    return address;
                };

                self.getNumberMatches = function (company) {
                    var matches;
                    if (self.allPeople().grouped.ent_id.groups.length !== 0)
                        matches = self.allPeople().grouped.ngroups;
                    else
                        matches = 0;
                    return matches;
                };

                self.getNumFound = function (company) {
                    var numFound = company.doclist.numFound;
                    var str = self.found() + " " + numFound + " " + self.entities();
                    return str;
                };

                //To load the details page when click on an entity
                self.loadPersonPage = function (comp) {
                    if (comp.doclist.docs[0].ent_id) {
                        id = comp.doclist.docs[0].ent_id;
                        var lang;
                        if (self.languageSel() !== "")
                            lang = self.languageSel().toString().substring(0, 2);
                        else
                            lang = "en";
                        translate = false;
                        history.pushState(null, '', 'index.html?root=details&ent_id=' + id + '&lang=' + lang);
                        oj.Router.sync();
                        utils.rememberState(self.nameSearch(), self.filterTree(), self.filterTreeList());
                        //Store the position of the Filter Tree Panels
                        
                        $("#treeCountryLibContainer").draggable().resizable();
                        $("#treeListLibContainer").draggable().resizable();
                        $("#treeTypeLibContainer").draggable().resizable()
                        
                        var sizeTreeCountry = $("#treeCountryLibContainer").css(["width", "height"]);
                        var posTreeCountry = $("#treeCountryLibContainer").position();
                        var sizeTreeList = $("#treeListLibContainer").css(["width", "height"]);
                        var posTreeList = $("#treeListLibContainer").position();
                        utils.rememberPositionTrees(sizeTreeCountry, posTreeCountry, sizeTreeList, posTreeList);
                    }

                };

                //To establish the previous state after returning from details page
                if (oj.Router.rootInstance.tx === "back") {
//                    var language = utils.getLanguage().toString()
//                    self.languageSel("german");
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
