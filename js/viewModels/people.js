/**
 * Copyright (c) 2014, 2016, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */
define(['ojs/ojcore', 'knockout', 'utils', 'data/data', 'jquery', 'ojs/ojrouter', 'ojs/ojknockout', 'promise', 'ojs/ojlistview',
    'ojs/ojmodel', 'ojs/ojpagingcontrol', 'ojs/ojpagingcontrol-model', 'ojs/ojbutton', 'ojs/ojtreemap', 'ojs/ojtree', 'ojs/ojselectcombobox'],
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
                self.facetField = ko.observable('&facet.field=add_country&facet.field=add_city&facet=on');
                self.scoreField = ko.observable('&fl=*,score');
                self.queryField = ko.observable('&q={!percentage t=QUERY_SIDE pw=0.8 f=nam_comp_name}');
                self.fqField = ko.observable('&fq=');


                //Observable for the HIGHLIGHTING data group
                self.allHighlighting = ko.observableArray([]);
                self.nameHighlight = ko.observableArray([]);
                
                self.facets = ko.observableArray([]);
                self.facetsCities = ko.observableArray([]);

                //variables to control data requests
                var nameBeforeUpdate = '';


                //filter for the queries
                var fqQueries = "";


                //new tree filter
                self.filterTree = ko.observableArray([]);
                self.filterTreeObs = ko.observable("");

                //data tree observable array
                self.dataTree = ko.observableArray([]);

                //control access to tree method
                self.treeInit = ko.observable("");

                self.comboboxSelectValue = ko.observable([]);
                self.arrSelCheckbox = ko.observableArray([]);


                /************************************** FILTER FUNCTION ***********************************************************/

                self.filteredAllPeople = ko.computed(function () {
                    var peopleFilter = new Array();
                    var name;
                    var index = 0;

                    var childs = new Array();

                    //var to store fq fields for filter
                    var fqFilter = "";


                    if (self.nameSearch().length === 0)
                    {
                        peopleFilter = [];
                    } else {

                        /************************************* FILTER FACETS ************************************************/

                        if (self.filterTreeObs() === "load filter" || self.filterTreeObs() === "remove filter") {
                            console.log("FILTER FACETS inside if and filterTreeObs length: " + self.filterTreeObs().toString());
                            //for the tree to stop creating itself again and as a node only the filtered element
                            self.treeInit("stop");
                            //self.filterTreeObs("");

                            var ind = 0;

                            if (self.filterTree().length > 0) {
                                fqFilter = "add_country:" + "\"" + self.filterTree()[ind].toString().substring(0, 2) + "\"";
                                for (ind = 1; ind < self.filterTree().length; ++ind)
                                    fqFilter = fqFilter + " OR " + "add_country:" + "\"" + self.filterTree()[ind].toString().substring(0, 2) + "\"";
                                //console.log(fqFilter);

                                fqFilter = "&fq=" + fqFilter;

                            }
                            if (self.filterTree().length === 0)
                                fqFilter = "";

                            fqQueries = fqFilter;
                            self.allPeople("");
                            self.allHighlighting("");
                            self.facets("");
                            self.facetsCities("");

                            /*** To replace the whitespaces with "~" *********/
                            name = self.nameSearch().replace(/\s+/g, '~ ');
                            /*** To delete the whitespaces from the end of the words ***/
                            name = name.replace(/\s*$/, "");
                            /*** Add "~" for more than 3 chars ***/
                            if (name.length >= 3)
                                name = name + "~";
                            /*** Remove multiple "~" ***/
                            name = name.replace(/\~+/g, '~');
                            console.log("name Filtered: " + name);
                            if (fqFilter.search("undefined") !== -1)
                                fqFilter = "";

                            $.getJSON(
                                    self.url().toString() +
                                    self.highlightField().toString() +
                                    self.groupField().toString() +
                                    self.facetField().toString() +
                                    self.scoreField().toString() + fqFilter +
                                    self.queryField().toString() +
                                    name).then(function (people) {
                                self.allPeople(people.grouped.ent_id.groups);
                                self.allHighlighting(people.highlighting);
                                self.facets(people.facet_counts.facet_fields.add_country);
                                self.facetsCities(people.facet_counts.facet_fields.add_country);

                                //self.filterTreeObs("done");

                                //call to the checkbox tree
                                //self.createCheckboxTree();


                            }).fail(function (error) {
                                console.log('Error in getting People data: ' + error.message);
                            });
                            if (self.filterTreeObs() === "load filter")
                                self.filterTreeObs("done loading");
                            if (self.filterTreeObs() === "remove filter")
                                self.filterTreeObs("done removing");

                            console.log("filteredAllPeople in facet if")

                            nameBeforeUpdate = self.nameSearch();
                            //console.log(nameUpdate);

                            peopleFilter = self.allPeople();
                        }


                        /*******************************************RETRIEVE DATA *******************************/

                        if (self.nameSearch() !== nameBeforeUpdate) {


                            fqQueries = "";
                            self.filterTree([]);

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
                            if (fqQueries.search("undefined") !== -1)
                                fqQueries = "";

                            $.getJSON(
                                    self.url().toString() +
                                    self.highlightField().toString() +
                                    self.groupField().toString() +
                                    self.facetField().toString() +
                                    self.scoreField().toString() + fqQueries +
                                    self.queryField().toString() +
                                    name).then(function (people) {
                                self.allPeople(people.grouped.ent_id.groups);
                                self.allHighlighting(people.highlighting);
                                self.facets(people.facet_counts.facet_fields.add_country);
                                self.facetsCities(people.facet_counts.facet_fields.add_city);

                                self.treeInit("");

                                //self.createCheckboxTree();
                                console.log("filteredAllPeople in nameSearch if")

                            }).fail(function (error) {
                                console.log('Error in getting People data: ' + error.message);
                            });
                        }
                        nameBeforeUpdate = self.nameSearch();
                        //self.treeInit("stop");

                        

                        
                        for (var i = 0;i< self.allPeople().length; ++i) {
                            var sse_id = self.allPeople()[i].doclist.docs[0].sse_id;
                            for (var key in self.allHighlighting())
                            if (sse_id === key){
                                var name = self.allHighlighting()[sse_id].nam_comp_name[0];
                                self.nameHighlight(name);
                                self.allPeople()[i].doclist.docs[0].nam_comp_name = name;
                            }
                        }



                        /*if(self.allHighlighting().length > 0){
                         for(var i = 0; self.allPeople().length; ++i){
                         var sse_id = self.allPeople()[i].doclist.docs[0].sse_id;
                         if(self.allHighlighting()[sse_id] !== "undefined")
                         self.allPeople()[i].doclist.docs[0].nam_comp_name = self.allHighlighting()[sse_id].nam_comp_name[0];
                         } 
                         }*/
                        peopleFilter = self.allPeople();

                    }

                    self.ready(true);
                    return peopleFilter;
                });



                /***********************************CheckBox Tree**************************************/



                self.addItem = function (parentUL, branch) {

                    for (var key in branch.children) {
                        var item = branch.children[key];
                        $item = $('<li>', {
                            id: "item" + item.id
                        });
                        $item.append($('<input>', {
                            type: "checkbox",
                            id: "item" + item.id,
                            name: "item" + item.id
                        }));
                        $item.append($('<label>', {
                            for : "item" + item.id,
                            text: item.title,
                            value: "val"
                        }));
                        parentUL.append($item);
                        if (item.children) {
                            var $ul = $('<ul>', {
                                style: 'display: none; list-style:none;'
                            }).appendTo($item);
                            $item.append();
                            self.addItem($ul, item);
                        }
                    }
                };

                self.createCheckboxTree = ko.computed(function () {
                    //console.log("createCheckboxTree out if")
                    if (self.nameSearch().length !== 0) {
                        console.log("createCheckboxTree in if")

                        var index = 0;
                        var id = 2;
                        var country = new Array();
                        var city = new Array();

                        if (self.treeInit().length === 0) {
                            for (index; index < parseInt(self.facets().length / 2); ++index) {

                                var nameCountry = self.facets()[index];
                                index = index + 1;
                                var valueCountry = self.facets()[index];

                                if (valueCountry !== 0) {
                                    var cityNode = {id: id + 100, title: "City"};
                                    city.push(cityNode);

                                    var countryNode = {id: id, title: nameCountry + ", " + valueCountry, children: city};
                                    country.push(countryNode);
                                    id = id + 1;
                                }
                            }
                            console.log("tree add data");
                        }
                        var countries = [{id: 1, title: "Country", children: country}];
                        self.dataTree({id: 0, title: "root", children: countries});



                        $(function () {
                            console.log("$function: " + self.treeInit());
                            if (self.treeInit().length === 0) {
                                $("#root").empty();
                                self.addItem($('#root'), self.dataTree());
                                console.log("$function in 1if");
                            }

                            $(':checkbox').change(function () {
                                //console.log("$function in checkbox out 1if");
                                //self.filterTreeObs("done");
                                console.log("$function in checkbox");
                                //$(this).closest('li').children('ul').slideToggle();
                                $(this).closest('li').find(':checkbox').prop('checked', $(this).prop('checked'));
                                //self.filterTreeObs("ready");

                                if ($(this).prop('checked') && $(this).attr("id") !== "item1") {

                                    self.arrSelCheckbox().push([$(this).next("label").text(), $(this).attr("id")])

                                    var searchEl = [$(this).next("label").text()].toString();
                                    var lon = self.filterTree().length;
                                    var arrEl;
                                    if (self.filterTree().length > 0)
                                        if (lon === 0)
                                            arrEl = self.filterTree()[0].toString();
                                        else
                                            arrEl = self.filterTree()[lon - 1].toString();

                                    if (searchEl !== arrEl) {
                                        self.filterTree().push([$(this).next("label").text()]);
                                        self.comboboxSelectValue(self.filterTree());
                                        self.filterTreeObs("load filter");

                                    }
                                    //self.filterTreeObs("");
                                }
                                //console.log("$function in Checkox After the if Add: " + self.filterTree() + "," + self.filterTreeObs());

                                if (!$(this).prop('checked') && $(this).attr("id") !== "item1") {
                                    //self.filterTreeObs("done");
                                    var deleteEl = $(this).next("label").text().substring(0, 2);
                                    var filteredArray = self.filterTree().filter(function (el) {
                                        console.log("times filtering on removing");
                                        var bool = false;
                                        var elCheck = el.toString().substring(0, 2);
                                        if (deleteEl !== elCheck)
                                        {
                                            bool = true;
                                        }
                                        return bool;
                                    });
                                    console.log("" + self.filterTreeObs());
                                    if (self.filterTree().length !== filteredArray.length) {
                                        self.filterTree(filteredArray);
                                        self.filterTreeObs("remove filter");
                                        self.comboboxSelectValue(self.filterTree());
                                        self.filterTreeObs("stop combo update");
                                    }
                                }

                                if ($(this).prop('checked') && $(this).attr("id") === "item1") {
                                    alert("Cannot select all");
                                }

                            });

                            var slideClick = true;

                            $('label').click(function (el) {
                                //$(this).closest('li').find(':checkbox').trigger('click');
                                el.stopImmediatePropagation();
                                $(this).closest('li').children('ul').slideToggle();
                                if (slideClick) {

                                    slideClick = false;
                                }
                            });




                        });

                    } else {
                        // When there is a search query and a filter, and then it is emptied the search input, it is needed to get inside the if search name
                        nameBeforeUpdate = "start again on search";

                        $("#root").empty();
                    }
                });
                /**/
                /******************************************************************************/



                self.valueChangeHandlerCombobox = function (context, valueParam) {

                    if (valueParam.option === "value") {

                        if (valueParam.value.length < valueParam.previousValue.length) {


                            //$(this).closest('li').find(':checkbox').trigger('click');

                            if (self.filterTreeObs() !== "stop combo update") {
                                var diff = self.filterTree().filter(function (el) {
                                    var bool = false;
                                    var ser = el.toString();
                                    var arr = self.comboboxSelectValue();
                                    var inArr = $.inArray(ser, arr)
                                    if (inArr === -1) {
                                        bool = true;
                                    }
                                    return bool;
                                });
                                for (var i = 0; i < self.arrSelCheckbox().length; ++i)
                                    if (self.arrSelCheckbox()[i][0] === diff[0].toString()) {
                                        $("#" + self.arrSelCheckbox()[i][1]).closest('li').find(':checkbox').prop('checked', false);
                                        break;
                                    }
                                self.filterTree(valueParam.value);
                                self.filterTreeObs("remove filter");

                            }
                        }
                        console.log("comboboxChangeValue: " + valueParam);
                    }
                }


                /*/
                 self.listViewDataSource = ko.computed(function () {
                 return new oj.ArrayTableDataSource(self.filteredAllPeople(), {idAttribute: 'empId'});
                 });
                 /**/

                /**/
                self.cardViewPagingDataSource = ko.computed(function () {
                    return new oj.ArrayPagingDataSource((self.filteredAllPeople()));
                });
                /**/

                /**/
                self.cardViewDataSource = ko.computed(function () {
                    return self.cardViewPagingDataSource().getWindowObservable();
                });
                /**/

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
                    var name = company.doclist.docs[0].nam_comp_name;
                    var span = "";
                    //if(self.nameSearch() === "pe")
                    if(name.indexOf("</") !== -1){
                        var first = self.nameHighlight().indexOf("<");
                        var last = self.nameHighlight().indexOf("n>")
                        span = self.nameHighlight().substring(first,last+2);
                        span;
                        var extractName = self.nameHighlight().substring(first+24,last-5);
                        
                        var div = document.getElementById('nameEntity')
                        //div.insertAdjacentHTML('afterend', span)
                        //name = " "
                        //$( "#nameEntity" ).append( self.nameHighlight() );
                    }
                        
                    return name ;
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
                self.getMatches = function (company) {
                    var matches = company.doclist.numFound;
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
