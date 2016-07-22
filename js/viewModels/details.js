
/* global d3, tooltip, german */

define(['ojs/ojcore', 'knockout', 'jquery', 'd3', 'arangodb', 'utils', 'datatables', 'lang/lang.ge', 'lang/lang.en', 'lang/lang.fr', 'knockout-postbox'
], function (oj, ko, $, d3, arangodb, utils, datatables) {

    ko.bindingHandlers.svg = {
        init: function (element, valueAccessor) {

            //In order to use events, functions should be referenced with "self"
            var self = this;
            //Just to test the unwrap function
            var infoMainViewModel = ko.unwrap(valueAccessor());
            self.lang = infoMainViewModel[0];
            var entid = infoMainViewModel[1];


            //Observables useful for translations
            self.tooltipType = ko.observable("Type");
            self.tooltipStatus = ko.observable("Status");
            self.tooltipListDetails1 = ko.observable("Listed in");
            self.tooltipListDetails2 = ko.observable("Sanction Lists");
            //self.validFrom = ko.observable("The Expiration Date is");

            //In order to remember clicked entities on the graph
            self.clickedNodes = new Array();


            //Observable to store node information
            self.nodeData = ko.observableArray([""]);

            //To store state before expanding the tree
            self.oldNodes = new Array();
            self.oldLinks = new Array();

            //window.timeout to launch the code after the dom loaded
            window.setTimeout(function () {
                //alert("ready visual");

                var width = d3.select("#associate_info").node().getBoundingClientRect().width / 2;
                var height = d3.select("#associate_info").node().getBoundingClientRect().height;

                d3.select("#visualization")
                        .style("width", "50%")
                        .style("max-width", "50%");

                d3.select("#trustScore")
                        .attr("transform", "translate(570,-14)");
                var IsExpanded = false;

                var margin = {top: -1, right: -1, bottom: -1, left: -1};

                var isChosen = 0;

                var force = d3.layout.force()
                        .charge(-270)
                        .distance(370)
                        .size([width, height]);


                var drag = force.drag()
                        .origin(function (d) {
                            return d;
                        })
                        .on("dragstart", dragstarted)
                        .on("drag", dragged)
                        .on("dragend", dragended);

                var zoom = d3.behavior.zoom()
                        .scaleExtent([0.4, 6])
                        .on("zoom", zoomed);

                var svg = d3.select("#associate_info")
                        .select("#visualization").append("svg")
                        .attr("class", "svg")
                        .attr("width", width)
                        .attr("height", height)
                        .call(zoom)
                        .on("dblclick.zoom", null);

                var container = svg.append("g");

                function isASCII(str) {
                    return /^[\x00-\x7F]*$/.test(str);
                }

                function getEnglishName(names) {
                    var name = "";
                    if (names)
                        if (names.length !== 0)
                            names.forEach(function (n) {
                                if (isASCII(n.name)) {
                                    name = n.name;
                                }
                            });
                    return name;
                }

                var updating = false;

                //Create the graphic and add info into the tabs
                self.createGraphAndAddInfo = function (searchedEntity, linksBetweenEntities, relatedEntities) {

                    if (updating) {

                        var nodes = force.nodes();
                        var links = force.links();

                        var relations = new Array();
                        var entities = new Array();
                        var firstLinks = links;
                        var firstNodes = nodes;

                        linksBetweenEntities.forEach(function (relation) {
                            var resultSource = $.grep(relatedEntities, function (e) {
                                return e._id === relation._from;
                            });
                            resultTarget = $.grep(relatedEntities, function (e) {
                                return e._id === relation._to;
                            });
                            relation["source"] = resultSource[0];
                            relation["target"] = resultTarget[0];

//                            relation.source["x"]=0;
//                            relation.source["y"]=0;
//                            relation.target["x"]=0;
//                            relation.target["y"]=0;
                            
                            console.log(relation.target.names[0].name);
                            console.log(relation.target.x);

                            if (relation.source !== undefined) {
                                var source = relation.source;
                                if (source.x === undefined) {
//                                    alert(source.names[0].name + " source has x to 0");
                                    source["x"] = 0;
                                    source["y"] = 0;
                                }
                                var target = relation.target;
                                if (target.x === undefined) {
//                                    alert(target.names[0].name + " target has x to 0");
                                    target["x"] = 0;
                                    target["y"] = 0;
                                }

                            }
                        });


                        linksBetweenEntities.forEach(function (newRelation) {
                            var linkExist = $.grep(self.oldLinks, function (relation) {
                                return relation._id === newRelation._id;
                            });
                            if (linkExist.length === 0) {
                                self.oldLinks.push(newRelation);
                            }
                            //newRelation["name"] = newRelation.names[0].name;
                        });


                        relatedEntities.forEach(function (newEntity) {
                            //newEntity["name"] = newEntity.names[0].name;
                            var entityExist = $.grep(self.oldNodes, function (relatedEntity) {
                                return newEntity._id === relatedEntity._id;
                            });
                            if (entityExist.length === 0) {
                                self.oldNodes.push(newEntity);
                            }

                        });

                        relations = self.oldLinks;
                        entities = self.oldNodes;

                        //Store old state

                        firstLoad = true;
                        updating = false;
                    } else {
                        console.log("not updating");


                        root = searchedEntity;
                        root.x = width / 2;
                        root.y = height / 2;
                        root.fixed = true;

                        linksBetweenEntities.forEach(function (relation) {
                            var resultSource = $.grep(relatedEntities, function (e) {
                                return e._id === relation._from;
                            });
                            resultTarget = $.grep(relatedEntities, function (e) {
                                return e._id === relation._to;
                            });
                            relation["source"] = resultSource[0];
                            relation["target"] = resultTarget[0];
                        });

                        self.oldLinks = linksBetweenEntities;
                        self.oldNodes = relatedEntities;

                        var relations = linksBetweenEntities;
                        var entities = relatedEntities;
                    }



                    tooltip = d3.select(".tooltip");
                    var linkedByIndex = {};

                    linksBetweenEntities.forEach(function (relation) {
                        linkedByIndex[relation.source + "," + relation.target] = true;
                    });

                    /**/
                    var myScale = d3.scale.linear().domain([0, 100]).range([0, 2 * Math.PI]);

                    var arc = d3.svg.arc()
                            .innerRadius(43)
                            .outerRadius(46)
                            .startAngle(myScale(0))
                            .endAngle(myScale(100));

                    container.attr("transform", "translate(0,0)scale(0.5)");

                    var link = container.append("g").selectAll(".link")
                            .data(relations)
                            .enter().append("line")
                            .attr("class", "link")
//                            .attr("source", function (d) {
//                                return d.source.id;
//                            })
//                            .attr("target", function (d) {
//                                return d.target.id;
//                            })
                            .attr("x1", function (d) {
                                return d.source.x;
                            })
                            .attr("y1", function (d) {
                                return d.source.y;
                            })
                            .attr("x2", function (d) {
                                return d.target.x;
                            })
                            .attr("y2", function (d) {
                                return d.target.y;
                            })
                            .attr("type", function (d) {
                                var text = "";
                                d.relationType.forEach(function (relationType) {
                                    text = text + relationType;
                                });
                                return text;
                            })
                            .on("mouseover", function (d) {
                                linkToolTip(d.relationType);
                            })
                            .on("mouseout", function (d) {
                                tooltip
                                        .style("visibility", "hidden");
                            })
                            .on("mousemove", mousemove)
                            .style("stroke-width", function (d) {
                                return 6;
                            })
                            .style("marker-end", "url(#resolved)");
                    var marker = container.append("g").selectAll("marker")
                            .data(["suit", "licensing", "resolved"])
                            .enter().append("marker")
                            .attr("id", function (d) {
                                return d;
                            })
                            .attr("viewBox", "0 -5 10 10")
                            .attr("refX", 25)
                            .attr("refY", 0)
//                                        .attr("markerWidth", 2)
//                                        .attr("markerHeight", 2)
                            .attr("orient", "auto")
                            .append("path")
                            .attr("d", "M0,-5L10,0L0,5")
//                                        .style("stroke", "#4679BD")
                            .style("opacity", "0.6");



                    var node = container.append("g").selectAll(".node")
                            .data(entities)
                            .enter()
                            .append("g")
                            .attr("id", function (d) {
                                return d._id;
                            })
                            .attr("class", "node")
                            .attr("name", function (d) {
                                return getEnglishName(d.names);
                            })
                            .attr("address", function (d) {
                                if (d.addresses !== undefined)
                                    if (d.addresses[0] !== undefined)
                                        if (d.addresses[0].country !== undefined)
                                            return d.addresses[0].country;
                            })
                            .attr("isListedIn", function (d) {
                                if (d.sanctionName !== null)
                                    return d.sanctionName;
                                else
                                    return "";
                            })
//                            .attr("id", function (d) {
//                                return d.id;
//                            })
                            .attr("x", function (d) {
                                return d.x;
                            })
                            .attr("y", function (d) {
                                return d.y;
                            })
                            .attr("width", function (d) {
                                return "24px";
                            })
                            .attr("height", function (d) {
                                return "24px";
                            })
                            .attr("isChosen", "no")
//                                        .attr("name", function (d) {
//                                            return d.names[0].name;
//                                        })
                            .call(force.drag)
                            .on("mouseover", mouseover)
                            .on("mousemove", mousemove)
                            .on("mouseout", mouseout)
                            .on("click", clickImage)
                            .on("dblclick.zoom", null)
                            .on("dblclick", dblclick);

                    var trust_cirlce = node
                            .append("circle")
                            .attr("r", 26)
                            .style("fill", function (d) {
                                return trust_to_color(10, "Active");
                            });

//                                                        var image_node = node
//                                                                .append("image")
//                                                                .attr("class", "node_image")
//                                                                .attr("xlink:href", function (d) {
//                                                                    return "js/views/resources/" + d.type + ".svg";
//                                                                })
//                                                                .attr("x", -12)
//                                                                .attr("y", -12)
//                                                                .attr("width", function (d) {
//                                                                    return "24px";
//                                                                })
//                                                                .attr("height", function (d) {
//                                                                    return "24px";
//                                                                });

                    var vis = node
                            .append("path")
                            .attr("transform", function (d) {
                                return "scale(0.1,0.1)";
                            })
                            .attr("class", "highlight_circle")
                            .attr("d", arc)
                            .attr("opacity", 0);

                    var text = container.append("g").selectAll(".text")
                            .data(entities)
                            .enter().append("text")
                            .attr("class", "text_svg")
                            .attr("dy", ".35em")
                            .style("font-size", 13 + "px");

                    text.text(function (d) {
                        var name = "";
                        if (d.names)
                            if (d.names.length !== 0)
                                d.names.forEach(function (n) {
                                    if (isASCII(n.name)) {
                                        name = n.name;
                                    }
                                });
                        return name;
                    })
                            .style("text-anchor", "middle");


                    force
                            .nodes(entities)
                            .links(relations)
                            .start();


//                    force.on("end", function () {
//                        entities.attr('r', width / 25)
//                                .attr('cx', function (d) {
//                                    return d.x;
//                                })
//                                .attr('cy', function (d) {
//                                    return d.y;
//                                });
//
//
//                        relations.attr('x1', function (d) {
//                            return d.source.x;
//                        })
//                                .attr('y1', function (d) {
//                                    return d.source.y;
//                                })
//                                .attr('x2', function (d) {
//                                    return d.target.x;
//                                })
//                                .attr('y2', function (d) {
//                                    return d.target.y;
//                                });
//                    });


                    var text_link = container.append("g").selectAll(".text_link_svg")
                            .data(force.links())
                            .enter().append("text")
                            .text(function (d) {
                                return d.relationType;
                            })
                            .attr("class", "text_link_svg")
                            .attr("dy", ".35em")
                            .style("text-anchor", "middle")
                            .style("font-size", 10 + "px");

                    change();

                    //                            var trust = d3.select(".svg").append("g")
                    //                                    .attr("id", "trustScore")
                    //                                    .attr("transform", "translate(570,-14)");
                    //
                    //                            trust.append("rect")
                    //                                    .attr("width", 60 * graph.level_trust.length)
                    //                                    .attr("height", 27 * graph.level_trust.length)
                    //                                    .style("fill", "#eaf0fa");
                    //
                    //                            var trust_draw = trust.selectAll()
                    //                                    .data(graph.level_trust)
                    //                                    .enter();
                    //
                    //                            trust_draw.append("text")
                    //                                    .attr("transform", function (d, i) {
                    //                                        return "translate(22," + 25 * (i + 1) + ")";
                    //                                    })
                    //                                    .text(function (d) {
                    //                                        return d.Message;
                    //                                    })
                    //                                    .style("fill", "black")
                    //                                    .style("dominant-baseline", "central");
                    //
                    //                            trust_draw.append("circle")
                    //                                    .attr("r", 10)
                    //                                    .attr("transform", function (d, i) {
                    //                                        return "translate(10," + 25 * (i + 1) + ")";
                    //                                    })
                    //                                    .style("fill", function (d) {
                    //                                        return d.color;
                    //                                    });

                    function mouseout(node) {
                        text.style("font-weight", "normal");
                        link.style("stroke", "#999");
                        tooltip
                                .style("visibility", "hidden");
                    }
                    function mousemove(node) {
                        tooltip.style("top", (d3.event.pageY + 16) + "px")
                                .style("left", (d3.event.pageX + 16) + "px");
                    }
                    function mouseover(node) {
                        text.style("font-weight", function (o) {
                            return isConnected(node, o) ? "bold" : "normal";
                        });

                        link.style("stroke", function (o) {
                            return o.source.index === node.index || o.target.index === node.index ? "red" : "#999";
                        });

                        try {
                            statusColor = "red";
                            tooltip.style("visibility", "visible");
                            var name;
                            if (node.names === undefined)
                                name = " ";
                            else
                                name = getEnglishName(node.names);
                            var numberLists;
                            if (node.infos === undefined)
                                numberLists = 0;
                            else
                                numberLists = 1;

                            tooltip.html(name +
                                    "<br>" + self.tooltipType() + ": " + node.type +
                                    "<br>" + self.tooltipStatus() + ": <span style='color: " + statusColor + "'>" + node.status + "</span>" +
                                    "<br>" + self.tooltipListDetails1() + " " + numberLists + " " + self.tooltipListDetails2());
                        } catch (err) {
                            tooltip.style("visibility", "visible");
                            tooltip.html(node.name);

                        }
                    }

                    /////Checkbox///////////////////////////////////////////////////////////
                    d3.select("#node_check_box").on("change", change);
                    d3.select("#link_check_box").on("change", change);
                    function change() {
                        if (d3.select('#node_check_box').property('checked') === false)
                            isDisplay = "initial";
                        else
                            isDisplay = "none";
                        d3.selectAll(".text_svg")
                                .style("display", isDisplay);

                        if (d3.select('#link_check_box').property('checked') === false)
                            isDisplay = "initial";
                        else
                            isDisplay = "none";
                        d3.selectAll(".text_link_svg")
                                .style("display", isDisplay);
                    }
                    ///////////////////////////////////////////////////////////////////////

                    function isConnected(a, b) {
                        return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index === b.index;
                    }

                    function dblclick(node) {
                        root.fixed = false;
                    }

                    render();
                    function render() {
                        force.on("tick", function () {


                            text_link.attr("x", function (d) {
                                return (d.source.x + d.target.x) / 2 + 3;
                            })
                                    .attr("y", function (d) {
                                        return (d.source.y + d.target.y) / 2;
                                    });


                            link.attr("x1", function (d) {
                                return d.source.x;
                            })
                                    .attr("y1", function (d) {
                                        return d.source.y;
                                    })
                                    .attr("x2", function (d) {
                                        return d.target.x;
                                    })
                                    .attr("y2", function (d) {
                                        return d.target.y;
                                    });
                            //.style("stroke",function(d){if(d.linktype=="Subsidiary") return "red";});

                            node.attr("transform", function (d) {
                                return "translate(" + d.x + "," + d.y + ")";
                            });

                            text.attr("x", function (d) {
                                return d.x;
                            })
                                    .attr("y", function (d) {
                                        return d.y + 38;
                                    });
                        });
                    }

                    //Add Information to the first half of the screen
                    function click(list) {
                        /////////////////////Return everything in svg to normal///////////////////
                        vis = d3.selectAll(".highlight_circle");

                        vis.attr("transform", "scale(0.1,0.1)")
                                .attr("opacity", 0);

                        d3.selectAll(".node").select(".node_image").transition()
                                .duration(750)
                                .attr("x", -12)
                                .attr("y", -12)
                                .attr("width", "24px")
                                .attr("height", "24px");

/////////////////////////Making the image bigger///////////////////////////
                        var node = d3.selectAll(".node")
                                .filter(function (d) {
                                    return d.id === list.id;
                                });

                        node.attr("isChosen", "yes")
                                .select(".node_image")
                                .transition()
                                .duration(750)
                                .attr("x", -20)
                                .attr("y", -20)
                                .attr("width", "40px")
                                .attr("height", "40px");

                        node.select(".highlight_circle")
                                .transition()
                                .duration(450)
                                .attr("transform", "scale(1,1)")
                                .attr("opacity", 0.7);

                        translateBeforeChose(node.datum().x, node.datum().y);

///////////////First load then color the first node/////////////////////////

                        d3.selectAll("li")
                                .style("background", "#cce5ff");

                        if (firstLoad) {
                            d3.select("#list").select("li")
                                    .style("background", "#ffa366");
                            firstLoad = false;
                        } else
                        {
                            d3.select(this)
                                    .style("background", "#ffa366");
                        }
///////////////////////////////////////////////////////////////////////////
                        populateDetailPage(node.datum());

                    }

                    var list = d3.select("#list").append("ul").selectAll("li")
                            .data(self.oldNodes)
                            .enter()
                            .append("li")
                            .attr("id", function (d, i) {
                                return "index" + i;
                            })
                            .style("font-size", 15 + "px")
                            .text(function (d) {
                                var name = "";
                                if (d.names)
                                    if (d.names.length !== 0)
                                        d.names.forEach(function (n) {
                                            if (isASCII(n.name)) {
                                                name = n.name;
                                            }
                                        });
                                return name;
                            })
                            .style("text-anchor", "start")
                            .on("click", click);
                    click(d3.select("#list").select("li").datum());

                    /**/

                };

                self.searchedEntity = ko.observableArray([]);
                self.relatedEntities = ko.observableArray([]);
                self.relatedEntitiesUnstructured = ko.observableArray([]);
                self.linksBetweenEntities = ko.observableArray([]);
                var db = arangodb();
                var queryForTheSearchedEntity = "FOR c IN Entity FILTER c.id == " + entid + " RETURN c";
                var queryForTheLinksBetweenEntities;
                var queryForTheRelatedEntities = "RETURN UNIQUE( UNION( FOR c IN EntityRelation FILTER c._key LIKE " + "\"" + "FROM" + entid + "%" + "\"" + " RETURN (FOR d IN Entity FILTER d._id == c._to RETURN d),FOR c IN EntityRelation FILTER c._key LIKE " + "\"" + "%TO" + entid + "%" + "\"" + "RETURN  (FOR d IN Entity FILTER d._id == c._from RETURN d)))";
                db.query(queryForTheSearchedEntity).then(function (ent) {
                    var entity = ent._result[0];
                    if (entity !== undefined)
                        queryForTheLinksBetweenEntities = "FOR c IN EntityRelation FILTER c._from==" + "\"" + entity._id + "\"" + " OR c._to==" + "\"" + entity._id + "\"" + " RETURN c";
                    self.searchedEntity(entity);
                    self.clickedNodes.push(entity);
                }).then(function () {
                    if (queryForTheLinksBetweenEntities !== undefined)
                        db.query(queryForTheLinksBetweenEntities).then(function (lin) {
                            var links = lin._result;
                            self.linksBetweenEntities(links);
                        }).then(function () {
                            db.query(queryForTheRelatedEntities).then(function (rel) {
                                var relations = rel._result;
                                self.relatedEntitiesUnstructured(relations);
                                self.relatedEntities().push(self.searchedEntity());
                                self.relatedEntitiesUnstructured()[0].forEach(function (entity) {
                                    self.relatedEntities().push(entity[0]);
                                });
                            }).then(function () {
                                //Go to the building graph function
                                self.createGraphAndAddInfo(self.searchedEntity(), self.linksBetweenEntities(), self.relatedEntities());

                            });
                        });
                });


                self.reCalculateLayoutWhenResize = function () {
                    if (IsExpanded === false) {
                        width = d3.select("#associate_info").node().getBoundingClientRect().width / 2;
                        height = d3.select("#associate_info").node().getBoundingClientRect().height;

                        svg.attr("width", width).attr("height", height);
                    }
                };

                self.expandForceLayout = function () {
                    if (IsExpanded === false) {
                        d3.select("#associate_info_node").
                                style("display", "none");

                        width = d3.select("#associate_info").node().getBoundingClientRect().width;
                        height = d3.select("#associate_info").node().getBoundingClientRect().height;
                        svg
                                .attr("width", width)
                                .attr("height", height);

                        d3.select("#visualization")
                                .style("width", "100%")
                                .style("max-width", "100%");

                        d3.select("#trustScore")
                                .attr("transform", "translate(1290,-14)");

                        d3.select("#expand_forcelayout")
                                .text(">>>");
                        IsExpanded = true;
                    } else {
                        collapseForceLayout();
                    }
                };

                function collapseForceLayout() {

                    d3.select("#associate_info_node").
                            style("display", null);

                    width = d3.select("#associate_info").node().getBoundingClientRect().width / 2;
                    height = d3.select("#associate_info").node().getBoundingClientRect().height;
                    svg
                            .attr("width", width)
                            .attr("height", height);

                    d3.select("#visualization")
                            .style("width", "50%")
                            .style("max-width", "50%");

                    d3.select("#trustScore")
                            .attr("transform", "translate(570,-14)");

                    d3.select("#expand_forcelayout")
                            .text("<<<");
                    IsExpanded = false;
                }

                function linkToolTip(linkRelationType) {
                    var text = "";
                    linkRelationType.forEach(function (relationType) {
                        text = text + relationType + "\r\n"
                    });
                    tooltip.text(text);
                    tooltip.style("visibility", "visible");
                }

                function zoomed() {
//     container.attr("transform", "translate(0,0 )scale(1)");
                    container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                }

                function dragstarted(d) {
                    d3.event.sourceEvent.stopPropagation();
                    d3.select(this).classed("dragging", true);
                }

                function dragged(d) {
                    root = d;
                    root.fixed = true;
                    d3.select(this).attr("x", d.x = d3.event.x).attr("y", d.y = d3.event.y);
                }

                function dragended(d) {
                    d3.select(this).classed("dragging", false);
                }

                function translateBeforeChose(x, y) {
                    var dcx = (width / 2 - x * zoom.scale());
                    var dcy = (height / 2 - y * zoom.scale());
                    zoom.translate([dcx, dcy]);

                    container
                            .transition()
                            .duration(750)
                            .attr("transform", "translate(" + dcx + "," + dcy + ")scale(" + zoom.scale() + ")");
                }

                function trust_to_color(trust, status) {
                    try {
                        if (status === "Inactive")
                            return"grey";
                    } catch (err) {

                    }
                    if (trust >= 80) {
                        return "green";

                    } else if (trust >= 30 && trust <= 79) {
                        return "yellow";

                    } else if (trust <= 30) {
                        return "red";

                    }
                }

                function clickImage(node) {
                    //root.fixed = false;



                    if (d3.event.defaultPrevented)
                        return;

                    //Creating new trees
                    var clickedNode = $.grep(self.clickedNodes, function (clickedNode) {
                        return clickedNode._id === node._id;
                    });
                    if (clickedNode.length === 0) {
                        //There are to ids: the document id and the node id
                        var entity_id = node._id;
                        var entityid = node.id;
                        //Arrays to store the nodes and the links
                        var newLinks;
                        var newEntitiesUnstructured;
                        var newEntities;
                        //Queries to make
                        var queryRelation = "FOR c IN EntityRelation FILTER c._from==" + "\"" + entity_id + "\"" + " OR c._to==" + "\"" + entity_id + "\"" + " RETURN c";
                        var queryEntities = "RETURN UNIQUE( UNION( FOR c IN EntityRelation FILTER c._key LIKE " + "\"" + "FROM" + entityid + "%" + "\"" + " RETURN (FOR d IN Entity FILTER d._id == c._to RETURN d),FOR c IN EntityRelation FILTER c._key LIKE " + "\"" + "%TO" + entityid + "%" + "\"" + "RETURN  (FOR d IN Entity FILTER d._id == c._from RETURN d)))";
                        db.query(queryRelation).then(function (lin) {
                            var links = lin._result;
                            if (links.length > 1) {
                                newLinks = links;

                            }
                        }).then(function () {
                            if (newLinks)
                                db.query(queryEntities).then(function (rel) {
                                    var relations = rel._result;
                                    newEntitiesUnstructured = relations;
                                    newEntities = [node];
                                    newEntitiesUnstructured[0].forEach(function (entity) {
                                        newEntities.push(entity[0]);
                                    });
                                }).then(function () {
                                    //Remove the nodes and relations before. For some reason d3, on updating, duplicates the graph.    
                                    container.selectAll("*").remove();
                                    d3.select("#list").selectAll("li").remove();
                                    //Update
                                    updating = true;
                                    self.clickedNodes.push(node);
                                    self.createGraphAndAddInfo([node], newLinks, newEntities);
                                });
                        });
                    }
                    d3.selectAll(".node")
                            .attr("isChosen", "no")
                            .select(".node_image")
                            .transition()
                            .attr("x", -12)
                            .attr("y", -12)
                            .attr("width", "24px")
                            .attr("height", "24px");

                    vis = d3.selectAll(".highlight_circle");
                    vis.attr("transform", "scale(0.1,0.1)")
                            .attr("opacity", 0);

                    //Translte selected node to middle////////////////////////	
                    translateBeforeChose(node.x, node.y);

                    //Set the node with isChosen yes to bigger/////////////
                    d3.select(this)
                            .attr("isChosen", "yes")
                            .select(".node_image")
                            .transition()
                            .duration(750)
                            .attr("x", -20)
                            .attr("y", -20)
                            .attr("width", "40px")
                            .attr("height", "40px")
                            .style("fill", "lightsteelblue");

                    d3.select(this)
                            .select(".highlight_circle")
                            .transition()
                            .duration(450)
                            .attr("transform", "scale(1,1)")
                            .attr("opacity", 0.9);

///////////////////Color the coressponding list of name////////////////////////////

                    var chosenItem = d3.select("#list")
                            .selectAll("li")
                            .filter(function (d) {
                                return node.id === d.id;
                            });

                    d3.select("#list")
                            .property("scrollTop", chosenItem.attr("id").toString().replace('index', '') * 19)
                            .selectAll("li")
                            .style("background", function (d) {
                                if (node.id === d.id)
                                    return "#ffa366";
                                else
                                    return "#cce5ff";
                            });
////////////////////////////Call function on detail.js////////////////////////////////	
                    populateDetailPage(node);

                }

                /*
                 * details.js
                 */

                var detail = d3.select("#detail_info");
                var firstLoad = true;
                var isAdvancedSearchClose = true;
                var isFirstAdvancedSearchOpen = true;
                tooltip = d3.select(".tooltip");
                dummyData = [
                    {"name": "USSDN"},
                    {"name": "Long Long Long Long one"},
                    {"name": "Short"},
                    {"name": "CSFDSFSS"}];

                function mouseOverList(date) {
                    try {
                        tooltip = d3.select(".tooltip");
                        tooltip.style("visibility", "visible");
                        tooltip.html(
                                "Expiration Date: " + date);
                    } catch (err) {
                        tooltip.style("visibility", "hidden");


                    }

                }

                function mouseout(node) {
                    tooltip
                            .style("visibility", "hidden");
                }

                function mousemove(node) {
                    tooltip.style("top", (d3.event.pageY + 16) + "px")
                            .style("left", (d3.event.pageX + 16) + "px");
                }

                function getAddressFieldsObject(nodeAddress) {
                    var detailAddress = new Object();
                    if (nodeAddress.whole)
                        detailAddress["Whole"] = nodeAddress.whole;
                    else
                        detailAddress["Whole"] = "";
                    if (nodeAddress.country)
                        detailAddress["Country"] = nodeAddress.country;
                    else
                        detailAddress["Country"] = "";
                    if (nodeAddress.state)
                        detailAddress["State"] = nodeAddress.state;
                    else
                        detailAddress["State"] = "";
                    if (nodeAddress.zipcode)
                        detailAddress["Zipcode"] = nodeAddress.zipcode;
                    else
                        detailAddress["Zipcode"] = "";
                    if (nodeAddress.city)
                        detailAddress["City"] = nodeAddress.city;
                    else
                        detailAddress["City"] = "";
                    if (nodeAddress.district)
                        detailAddress["District"] = nodeAddress.district;
                    else
                        detailAddress["District"] = "";
                    if (nodeAddress.streetaddress)
                        detailAddress["StreetAddress"] = nodeAddress.streetaddress;
                    else
                        detailAddress["StreetAddress"] = "";
                    if (nodeAddress.street)
                        detailAddress["Street"] = nodeAddress.street;
                    else
                        detailAddress["Street"] = "";
                    if (nodeAddress.house)
                        detailAddress["House"] = nodeAddress.house;
                    else
                        detailAddress["House"] = "";
                    if (nodeAddress.building)
                        detailAddress["Building"] = nodeAddress.building;
                    else
                        detailAddress["Building"] = "";
                    if (nodeAddress.floor)
                        detailAddress["Floor"] = nodeAddress.floor;
                    else
                        detailAddress["Floor"] = "";
                    if (nodeAddress.appartment)
                        detailAddress["Appartment"] = nodeAddress.appartment;
                    else
                        detailAddress["Appartment"] = "";
                    if (nodeAddress.room)
                        detailAddress["Room"] = nodeAddress.room;
                    else
                        detailAddress["Room"] = "";
                    if (nodeAddress.sources)
                        detailAddress["Sources"] = nodeAddress.sources;
                    else
                        detailAddress["Sources"] = "";


//                    }
                    return detailAddress;
                }

                function getAddressFields(nodeAddress) {
                    var detailAddress = "";
                    if (nodeAddress.whole)
                        detailAddress = nodeAddress.whole;
                    else {
                        if (nodeAddress.streetaddress)
                            detailAddress = nodeAddress.streetaddress;
                        else {
                            if (nodeAddress.room)
                                detailAddress = nodeAddress.room;
                            if (nodeAddress.appartment)
                                if (detailAddress !== "")
                                    detailAddress = detailAddress + ", " + nodeAddress.appartment;
                                else
                                    detailAddress = nodeAddress.appartment;
                            if (nodeAddress.floor)
                                if (detailAddress !== "")
                                    detailAddress = detailAddress + ", " + nodeAddress.floor;
                                else
                                    detailAddress = nodeAddress.floor;
                            if (nodeAddress.building)
                                if (detailAddress !== "")
                                    detailAddress = detailAddress + ", " + nodeAddress.building;
                                else
                                    detailAddress = nodeAddress.building;
                            if (nodeAddress.house)
                                if (detailAddress !== "")
                                    detailAddress = detailAddress + ", " + nodeAddress.house;
                                else
                                    detailAddress = nodeAddress.house;
                            if (nodeAddress.street)
                                if (detailAddress !== "")
                                    detailAddress = detailAddress + ", " + nodeAddress.street;
                                else
                                    detailAddress = nodeAddress.street;
                        }
                        if (nodeAddress.district)
                            if (detailAddress !== "")
                                detailAddress = detailAddress + ", " + nodeAddress.district;
                            else
                                detailAddress = nodeAddress.district;
                        if (nodeAddress.city)
                            if (detailAddress !== "")
                                detailAddress = detailAddress + ", " + nodeAddress.city;
                            else
                                detailAddress = nodeAddress.city;

                        if (nodeAddress.zipcode)
                            if (detailAddress !== "")
                                detailAddress = detailAddress + ", " + nodeAddress.zipcode;
                            else
                                detailAddress = nodeAddress.zipcode;

                        if (nodeAddress.state)
                            if (detailAddress !== "")
                                detailAddress = detailAddress + ", " + nodeAddress.state;
                            else
                                detailAddress = nodeAddress.state;
                        if (nodeAddress.country)
                            if (detailAddress !== "")
                                detailAddress = detailAddress + ", " + nodeAddress.country;
                            else
                                detailAddress = nodeAddress.country;
                    }
                    return detailAddress;
                }

                function populateDetailPage(node) {
                    ///Special case for changing Identification
                    self.nodeData(node);


                    switch (node.type) {
                        case "company":
                            d3.select("#identification_label")
                                    .text("Company Register ID");
                            break;
                        case "human":
                            d3.select("#identification_label")
                                    .text("Passport");
                            break;
                        case "bank":
                            d3.select("#identification_label")
                                    .text("Bank ID");
                            break;
                        default:
                            d3.select("#identification_label")
                                    .text("Identification");
                            break;
                    }


                    //////////////////////Populate content in to detail div/////////////////// 
                    d3.select("#mainName").remove();
                    d3.select("#mainAddress").remove();
                    d3.select("#mainIdentification").remove();
                    d3.select("#mainCountry").remove();
                    //d3.select("#TableSanctionLists").select("tbody").selectAll("tr").remove();


                    //////////////////////Populate content in to detail div///////////////////
                    var listList = "";
                    var numOfList;
                    var measures = null;
                    try {
                        measures = node.AllMeasures;
                    } catch (e) {
                        measures = ["arms"];
                    }

                    ///////////////////////////////////////////////////////////////////////////
                    var nodename = "";
                    if (node.names) {
                        if (node.names.length !== 0) {
                            node.names.forEach(function (n) {
                                if (isASCII(n.name)) {
                                    nodename = n.name;
                                }
                            });
                        }
                    }

                    detail.select("#detailsName").append("div").text(nodename)
                            .attr("class", "description_value")
                            .attr("id", "mainName")
                            .attr("position", "relative");

                    var nodeAddress;
                    var detailAddress = "";
                    if (node.addresses === undefined)
                        nodeAddress = "";
                    else if (node.addresses.length === 0)
                        nodeAddress = "";
                    else {
                        nodeAddress = node.addresses[0];
                        detailAddress = getAddressFields(nodeAddress);
                    }

                    detail.select("#detailsAddress").append("div").text(detailAddress)
                            .attr("class", "description_value")
                            .attr("id", "mainAddress")
                            .attr("position", "relative");

                    detail.select("#identification_container").append("div").text(node.id)
                            .attr("class", "description_value")
                            .attr("id", "mainIdentification")
                            .attr("position", "relative");

                    detail.select("#country_container").append("div").text(nodeAddress.country)
                            .attr("class", "description_value")
                            .attr("id", "mainCountry")
                            .attr("position", "relative");


                    try {
                        detail.select(".measure").selectAll(".measure_icon")
                                .data(measures)
                                .enter()
                                .append("img")
                                .attr("class", "measure_icon")
                                .attr("src", function (d) {
                                    return "js/views/resources/" + d + ".svg";
                                });
                    } catch (err) {
                    }
                    //Preparing data to populate the list////////////////////////

                    //Commented for future use, when will be more than one list for an entity
//                    try
//                    {
//                        listList1 = node.sanctionName;
//                        for (var i in listList1) {
//                            listList = listList.concat(listList1[i].info, ",");
//                        }
//                        listList = listList1;
//// 	listList=node.datum().isListedIn
//// 	.each().Name.toString().split(",");
//                        listList = listList.slice(0, -1);
//                        listList = listList.split(",");
//                        if (listList[0] === "")
//                            numOfList = 0;
//                        else
//                            numOfList = listList.length;
//                    } catch (err) {
//                        numOfList = 0;
//                    }

                    try
                    {
                        node.sanctionName;
                        numOfList = 1;
                    } catch (err) {
                        numOfList = 0;
                    }
                    d3.select("#numOfList")
                            .text(numOfList);

                    try {
                        var listAKA = node.names;
                        numOfAKA = listAKA.length;

                    } catch (err) {
                        numOfAKA = 0;

                    }
                    d3.select("#numOfName")
                            .text(numOfAKA);
                    try {
                        var listKA = node.addresses;
                        numOfAddress = listKA.length;
                        ;
                    } catch (err) {
                        numOfAddress = 0;
                    }

                    d3.select("#numOfAddress").text(numOfAddress);

                    //
                    //Tables Informatio
                    //
                    //Table for Sanction Lists
                    var dataSanctionLists = new Array();
                    for (var i = 0; i < [node.sanctionName].length; ++i) {
                        dataSanctionLists.push({sanctionList: node.sanctionName});
                    }
                    var tableSanctionLists = $("#TableSanctionLists").DataTable({
                        data: dataSanctionLists,
                        columns: [
                            {data: 'sanctionList'}
                        ],
                        "paging": false,
                        "info": false,
                        "destroy": true,
                        "searching": false
                    });
                    $("#TableSanctionLists").find("tbody").find("tr").find("td").attr("style", "cursor:pointer");
                    $("#TableSanctionLists").find("thead").find("tr").find("th").attr("style", "cursor:default");
                    $("#TableSanctionLists").find("tbody").find("tr").on("click", overlay);
                    //Table for known names
                    var dataNames = node.names;
                    var languageEmpty = true;
                    for (var i = 0; i < dataNames.length; ++i) {
                        if (dataNames[i].language === undefined)
                            dataNames[i]["language"] = "";
                        else
                            languageEmpty = false;

                    }
                    //$("#TableNames").DataTable().fnReloadAjax();
                    var tableNames = $("#TableNames").DataTable({
                        data: dataNames,
                        columns: [
                            {data: 'name'},
                            {data: 'language'}
                        ],
                        "paging": false,
                        "info": false,
                        "destroy": true,
                        "searching": false
                    });
                    if (languageEmpty === true)
                        tableNames.column(1).visible(false);
                    $("#TableNames").find("tbody").find("tr").find("td").attr("style", "cursor:text");
                    $("#TableNames").find("thead").find("tr").find("th").attr("style", "cursor:default");
                    //Table for known addresses
                    var dataAddresses = new Array();
                    for (var i = 0; i < node.addresses.length; ++i) {
                        dataAddresses.push({Address: getAddressFields(node.addresses[i])});
                    }
                    var tableAddresses = $("#TableAddresses").DataTable({
                        data: dataAddresses,
                        columns: [
                            {data: 'Address'}
                        ],
                        "paging": false,
                        "info": false,
                        "destroy": true,
                        "searching": false
                    });
                    $("#TableAddresses").find("tbody").find("tr").find("td").attr("style", "cursor:text");
                    $("#TableAddresses").find("thead").find("tr").find("th").attr("style", "cursor:default");
                }

                function overlay() {
                    //Show the table and add closing conditions
                    el = d3.select("#overlay");
                    el.style("visibility", (el.style("visibility") === "visible") ? "hidden" : "visible")
//                            .on("click", closeOverlay);
                    el.select(".close").on("click", closeOverlay);

                    //
                    //Build the rest of the table using d3
                    //
                    //Table for Known Names
//                    knownNamesTableColumns = ["Full Name"];
//                    var knownNamesTableColumnsTitle = d3.select("#known_names_table")
//                            .append("tr")
//                            .selectAll("tr")
//                            .data([knownNamesTableColumns])
//                            .enter()
//                            .append("th")
//                            .text(function (title) {
//                                return title;
//                            });
//                    for (var i = 0; i < self.nodeData().names.length; ++i) {
//                        var knownNamesTableData = d3.select("#known_names_table")
//                                .append("tr")
//                                .selectAll("tr")
//                                .data([self.nodeData().names[i]])
//                                .enter()
//                                .append("td")
//                                .text(function (names) {
//                                    return names.name;
//                                });
//                    }
                    //
                    //Table for known names
                    var dataNames = self.nodeData().names;
                    var languageEmpty = true;
                    for (var i = 0; i < dataNames.length; ++i) {
                        if (dataNames[i].language === undefined)
                            dataNames[i]["language"] = "";
                        else
                            languageEmpty = false;
                    }
                    var tableNames = $("#known_names_overlay_table").DataTable({
                        data: dataNames,
                        columns: [
                            {data: 'name'},
                            {data: 'language'}
                        ],
                        "paging": false,
                        "info": false,
                        "destroy": true,
                        "searching": false
                    });
                    if (languageEmpty === true)
                        tableNames.column(1).visible(false);
                    $("#known_names_overlay_table").find("tbody").find("tr").find("td").attr("style", "cursor:text");
                    $("#known_names_overlay_table").find("thead").find("tr").find("th").attr("style", "cursor:pointer");
                    //Table for Known Addresses
                    var emptyWholeColumn = true;
                    var emptyCountryColumn = true;
                    var emptyStateColumn = true;
                    var emptyZipcodeColumn = true;
                    var emptyCityColumn = true;
                    var emptyDistrictColumn = true;
                    var emptyStreetAddressColumn = true;
                    var emptyStreetColumn = true;
                    var emptyHouseColumn = true;
                    var emptyBuildingColumn = true;
                    var emptyFloorColumn = true;
                    var emptyAppartmentColumn = true;
                    var emptyRoomColumn = true;
                    var emptySourcesColumn = true;

                    var dataAddresses = new Array();
                    for (var i = 0; i < self.nodeData().addresses.length; ++i) {
                        dataAddresses.push(getAddressFieldsObject(self.nodeData().addresses[i]));
                        if (dataAddresses[i].Whole !== "")
                            emptyWholeColumn = false;
                        if (dataAddresses[i].Country !== "")
                            emptyCountryColumn = false;
                        if (dataAddresses[i].State !== "")
                            emptyStateColumn = false;
                        if (dataAddresses[i].Zipcode !== "")
                            emptyZipcodeColumn = false;
                        if (dataAddresses[i].City !== "")
                            emptyCityColumn = false;
                        if (dataAddresses[i].District !== "")
                            emptyDistrictColumn = false;
                        if (dataAddresses[i].StreetAddress !== "")
                            emptyStreetAddressColumn = false;
                        if (dataAddresses[i].Street !== "")
                            emptyStreetColumn = false;
                        if (dataAddresses[i].House !== "")
                            emptyHouseColumn = false;
                        if (dataAddresses[i].Building !== "")
                            emptyBuildingColumn = false;
                        if (dataAddresses[i].Floor !== "")
                            emptyFloorColumn = false;
                        if (dataAddresses[i].Appartment !== "")
                            emptyAppartmentColumn = false;
                        if (dataAddresses[i].Room !== "")
                            emptyRoomColumn = false;
                        if (dataAddresses[i].Sources !== "")
                            emptySourcesColumn = false;

                    }
                    var tableAddresses = $("#known_addresses_overlay_table").DataTable({
                        data: dataAddresses,
                        columns: [
                            {data: 'Country'},
                            {data: 'State'},
                            {data: 'Zipcode'},
                            {data: 'City'},
                            {data: 'District'},
                            {data: 'Street'},
                            {data: 'House'},
                            {data: 'Building'},
                            {data: 'Floor'},
                            {data: 'Appartment'},
                            {data: 'Room'},
                            {data: 'Whole'},
                            {data: 'StreetAddress'},
                            {data: 'Sources'}
                        ],
                        "paging": false,
                        "info": false,
                        "destroy": true,
                        "searching": false,
                        "width": "100%"
                    });


                    if (emptyCountryColumn === true)
                        tableAddresses.column(0).visible(false);
                    if (emptyStateColumn === true)
                        tableAddresses.column(1).visible(false);
                    if (emptyZipcodeColumn === true)
                        tableAddresses.column(2).visible(false);
                    if (emptyCityColumn === true)
                        tableAddresses.column(3).visible(false);
                    if (emptyDistrictColumn === true)
                        tableAddresses.column(4).visible(false);
                    if (emptyStreetColumn === true)
                        tableAddresses.column(5).visible(false);
                    if (emptyHouseColumn === true)
                        tableAddresses.column(6).visible(false);
                    if (emptyBuildingColumn === true)
                        tableAddresses.column(7).visible(false);
                    if (emptyFloorColumn === true)
                        tableAddresses.column(8).visible(false);
                    if (emptyAppartmentColumn === true)
                        tableAddresses.column(9).visible(false);
                    if (emptyRoomColumn === true)
                        tableAddresses.column(10).visible(false);
                    if (emptyWholeColumn === true)
                        tableAddresses.column(11).visible(false);
                    if (emptyStreetAddressColumn === true)
                        tableAddresses.column(12).visible(false);
                    if (emptySourcesColumn === true)
                        tableAddresses.column(13).visible(false);
                    $("#known_addresses_overlay_table").find("tbody").find("tr").find("td").attr("style", "cursor:text");
                    $("#known_addresses_overlay_table").find("thead").find("tr").find("th").attr("style", "cursor:pointer");
                    //
//                    knownAddressesTableColumns = ["Country", "State", "Zipcode", "City", "District", "Street", "House Nr.", "Building", "Floor", "Appartment", "Room Nr.", "Sources"];
//                    arrayArangoAllAddresses = ["country", "state", "zipcode", "city", "district", "street", "house", "building", "floor", "appartment", "room", "sourceclass"];
//
//                    var knownAddressesTableColumnsTitle = d3.select("#known_addresses_table")
//                            .append("tr")
//                            .selectAll("tr")
//                            .data(knownAddressesTableColumns)
//                            .enter()
//                            .append("th")
//                            .text(function (title) {
//                                return title;
//                            });
//                    for (var i = 0; i < self.nodeData().addresses.length; ++i) {
//                        var arrayExistingFieldsAddresses = new Array();
//                        for (var k = 0; k < arrayArangoAllAddresses.length; k++) {
//                            var addressField = arrayArangoAllAddresses[k];
//                            var addressValue = "";
//
//                            if (self.nodeData().addresses[i][addressField] !== undefined) {
//                                addressValue = self.nodeData().addresses[i][addressField];
//                            }
//                            arrayExistingFieldsAddresses.push([addressValue]);
//                        }
//                        var knownAddressesTableData = d3.select("#known_addresses_table")
//                                .append("tr")
//                                .selectAll("tr")
//                                .data(arrayExistingFieldsAddresses)
//                                .enter()
//                                .append("td")
//                                .text(function (address) {
//                                    return address;
//                                });
//                    }
                    //Table made by div elements for General Info
                    if (self.nodeData().date !== undefined)
                        d3.select("#general_info_div_table")
                                .append("div")
                                .attr("class", "general_info")
                                .text("Date: " + self.nodeData().date);
                    if (self.nodeData().status !== undefined)
                        d3.select("#general_info_div_table")
                                .append("div")
                                .attr("class", "general_info")
                                .text("Status: " + self.nodeData().status);
                    if (self.nodeData().type !== undefined)
                        d3.select("#general_info_div_table")
                                .append("div")
                                .attr("class", "general_info")
                                .text("Type: " + self.nodeData().type);
                    if (self.nodeData().validfrom !== undefined)
                        d3.select("#general_info_div_table")
                                .append("div")
                                .attr("class", "general_info")
                                .text("Valid From: " + self.nodeData().validfrom);
                    if (self.nodeData().validto !== undefined)
                        d3.select("#general_info_div_table")
                                .append("div")
                                .attr("class", "general_info")
                                .text("Valid From: " + self.nodeData().validto);
                    var arrayGeneralInfo = self.nodeData().infos;
                    var regulationLink = "";
                    for (var i = 0; i < arrayGeneralInfo.length; ++i) {
                        if (arrayGeneralInfo[i].type === "DBRegulationLink") {
                            regulationLink = arrayGeneralInfo[i].info;
                            d3.select("#general_info_div_table")
                                    .append("div")
                                    .attr("class", "general_info")
                                    .html('<a href="' + regulationLink + '" target="_blank">Regulation Link</a>')
                        } else if (arrayGeneralInfo[i].type !== "DBRegulationLink") {
                            d3.select("#general_info_div_table")
                                    .append("div")
                                    .attr("class", "general_info")
                                    .text(arrayGeneralInfo[i].info);
                        }
                    }

                }

                function closeOverlay() {
                    el = d3.select("#overlay");
                    d3.select(".close")
                            .on("click", el.style("visibility", "hidden"));

                    //Destroy the part of the table for known names that was built in overlay function
                    d3.select("#known_names_table")
                            .selectAll("tr").remove();

                    //Destroy the part of the table for known addresses that was built in overlay function
                    d3.select("#known_addresses_table")
                            .selectAll("tr").remove();

                    //Destroy the part of the table for general information that was built in overlay function
                    d3.select("#general_info_div_table")
                            .selectAll("div").remove();
                }

                /**/
                function click(list) {

                    /////////////////////Return everything in svg to normal///////////////////
                    vis = d3.selectAll(".highlight_circle");

                    vis.attr("transform", "scale(0.1,0.1)")
                            .attr("opacity", 0);

                    d3.selectAll(".node").select(".node_image").transition()
                            .duration(750)
                            .attr("x", -12)
                            .attr("y", -12)
                            .attr("width", "24px")
                            .attr("height", "24px");
///////////////////////////////////////////////////////////////////////////
/////////////////////////Making the image bigger///////////////////////////
                    var node = d3.selectAll(".node")
                            .filter(function (d) {
                                return d.id === list.id;
                            });

                    node.attr("isChosen", "yes")
                            .select(".node_image")
                            .transition()
                            .duration(750)
                            .attr("x", -20)
                            .attr("y", -20)
                            .attr("width", "40px")
                            .attr("height", "40px");

                    node.select(".highlight_circle")
                            .transition()
                            .duration(450)
                            .attr("transform", "scale(1,1)")
                            .attr("opacity", 0.7);

                    translateBeforeChose(node.datum().x, node.datum().y);

///////////////First load then color the first node/////////////////////////

                    d3.selectAll("li")
                            .style("background", "#cce5ff");

                    if (firstLoad) {
                        d3.select("#list").select("li")
                                .style("background", "#ffa366");
                        firstLoad = false;
                    } else
                    {
                        d3.select(this)
                                .style("background", "#ffa366");
                    }
///////////////////////////////////////////////////////////////////////////
                    populateDetailPage(node.datum());


                }
                /**/

                //Translation
                self.language = ko.observable().subscribeTo("languagesDetailsPage");
                self.language.subscribe(function (selectedLanguage) {
                    utils.setLanguage(selectedLanguage);
                    if (selectedLanguage === "german") {
                        //First part
                        $('#name_label').text(german.detailsPage.name);
                        $('#address_label').text(german.detailsPage.primaryAddress);
                        $('#identification_label').text(german.detailsPage.identification);
                        $('#country_label').text(german.detailsPage.country);
                        //Second Part
                        //Sanction Lists Description
                        var extractedListsNumber = parseInt($('#numOfList').text());
                        if (isNaN(extractedListsNumber))
                            extractedListsNumber = 0;
                        var firstPartListDesc = german.detailsPage.sanctionListsDescription1;
                        var secondPartListDesc = german.detailsPage.sanctionListsDescription2;
                        $('#sanction_lists_label').text("");
                        $('#sanction_lists_label').append(firstPartListDesc + ' ' + '<label id="numOfList" class="numOfList">' + extractedListsNumber + '</label>' + ' ' + secondPartListDesc);
                        //Known Names Description
                        var extractedNamesNumber = parseInt($('#numOfName').text());
                        if (isNaN(extractedNamesNumber))
                            extractedNamesNumber = 0;
                        var firstPartNamesDesc = german.detailsPage.knownNamesDescription1;
                        var secondPartNamesDesc = german.detailsPage.knownNamesDescription2;
                        $('#also_known_as_label').text("");
                        $('#also_known_as_label').append(firstPartNamesDesc + ' ' + '<label id="numOfName" class="numOfList">' + extractedNamesNumber + '</label>' + ' ' + secondPartNamesDesc);
                        //
                        //Known Addresses Description
                        var extractedAddressesNumber = parseInt($('#numOfAddress').text());
                        if (isNaN(extractedAddressesNumber))
                            extractedAddressesNumber = 0;
                        var firstPartAddressDesc = german.detailsPage.knownAddressDescription1;
                        var secondPartAddressDesc = german.detailsPage.knownAddressDescription2;
                        $('#known_address_label').text("");
                        $('#known_address_label').append(firstPartAddressDesc + ' ' + '<label id="numOfAddress" class="numOfList">' + extractedAddressesNumber + '</label>' + ' ' + secondPartAddressDesc);
                        //Hide node's label
                        $('#visualization_hide_node_label span').text(german.detailsPage.hideNodeName);
                        //Hide link's label
                        $('#visualization_hide_link_label span').text(german.detailsPage.hideLinkName);
                        //Tooltip
                        self.tooltipType(german.detailsPage.tooltipType);
                        self.tooltipStatus(german.detailsPage.tooltipStatus);
                        self.tooltipListDetails1(german.detailsPage.tooltipListDetails1);
                        self.tooltipListDetails2(german.detailsPage.tooltipListDetails2);
                        //Overlay Table
                        $('#known_names_table_head').text(german.detailsPage.knownNames);
                        $('#known_addresses_table_head').text(german.detailsPage.knownAddresses);
                        $('#known_names_table_head').text(german.detailsPage.generalInfo);
                    } else if (selectedLanguage === "english") {
                        //First part
                        $('#name_label').text(english.detailsPage.name);
                        $('#address_label').text(english.detailsPage.primaryAddress);
                        $('#identification_label').text(english.detailsPage.identification);
                        $('#country_label').text(english.detailsPage.country);
                        //Second Part
                        //Sanction Lists Description
                        var extractedListsNumber = parseInt($('#numOfList').text());
                        if (isNaN(extractedListsNumber))
                            extractedListsNumber = 0;
                        var firstPart = english.detailsPage.sanctionListsDescription1;
                        var secondPart = english.detailsPage.sanctionListsDescription2;
                        $('#sanction_lists_label').text("");
                        $('#sanction_lists_label').append(firstPart + ' ' + '<label id="numOfList" class="numOfList">' + extractedListsNumber + '</label>' + ' ' + secondPart);
                        //Known Names Description
                        var extractedNamesNumber = parseInt($('#numOfName').text());
                        if (isNaN(extractedNamesNumber))
                            extractedNamesNumber = 0;
                        var firstPartNamesDesc = english.detailsPage.knownNamesDescription1;
                        var secondPartNamesDesc = english.detailsPage.knownNamesDescription2;
                        $('#also_known_as_label').text("");
                        $('#also_known_as_label').append(firstPartNamesDesc + ' ' + '<label id="numOfName" class="numOfList">' + extractedNamesNumber + '</label>' + ' ' + secondPartNamesDesc);
                        //Known Addresses Description
                        var extractedAddressesNumber = parseInt($('#numOfAddress').text());
                        if (isNaN(extractedAddressesNumber))
                            extractedAddressesNumber = 0;
                        var firstPartAddressDesc = english.detailsPage.knownAddressDescription1;
                        var secondPartAddressDesc = english.detailsPage.knownAddressDescription2;
                        $('#known_address_label').text("");
                        $('#known_address_label').append(firstPartAddressDesc + ' ' + '<label id="numOfAddress" class="numOfList">' + extractedAddressesNumber + '</label>' + ' ' + secondPartAddressDesc);
                        //Hide node's label
                        $('#visualization_hide_node_label span').text(english.detailsPage.hideNodeName);
                        //Hide link's label
                        $('#visualization_hide_link_label span').text(english.detailsPage.hideLinkName);
                        //Tooltip
                        self.tooltipType(english.detailsPage.tooltipType);
                        self.tooltipStatus(english.detailsPage.tooltipStatus);
                        self.tooltipListDetails1(english.detailsPage.tooltipListDetails1);
                        self.tooltipListDetails2(english.detailsPage.tooltipListDetails2);
                        //Overlay Table
                        $('#known_names_table_head').text(english.detailsPage.knownNames);
                        $('#known_addresses_table_head').text(english.detailsPage.knownAddresses);
                        $('#known_names_table_head').text(english.detailsPage.generalInfo);
                    } else if (selectedLanguage === "french") {
                        //First part
                        $('#name_label').text(french.detailsPage.name);
                        $('#address_label').text(french.detailsPage.primaryAddress);
                        $('#identification_label').text(french.detailsPage.identification);
                        $('#country_label').text(french.detailsPage.country);
                        //Second Part
                        //Sanction Lists Description
                        var extractedListsNumber = parseInt($('#numOfList').text());
                        if (isNaN(extractedListsNumber))
                            extractedListsNumber = 0;
                        var firstPart = french.detailsPage.sanctionListsDescription1;
                        var secondPart = french.detailsPage.sanctionListsDescription2;
                        $('#sanction_lists_label').text("");
                        $('#sanction_lists_label').append(firstPart + ' ' + '<label id="numOfList" class="numOfList">' + extractedListsNumber + '</label>' + ' ' + secondPart);
                        //Known Names Description
                        var extractedNamesNumber = parseInt($('#numOfName').text());
                        if (isNaN(extractedNamesNumber))
                            extractedNamesNumber = 0;
                        var firstPartNamesDesc = french.detailsPage.knownNamesDescription1;
                        var secondPartNamesDesc = french.detailsPage.knownNamesDescription2;
                        $('#also_known_as_label').text("");
                        $('#also_known_as_label').append(firstPartNamesDesc + ' ' + '<label id="numOfName" class="numOfList">' + extractedNamesNumber + '</label>' + ' ' + secondPartNamesDesc);
                        //Known Addresses Description
                        var extractedAddressesNumber = parseInt($('#numOfAddress').text());
                        if (isNaN(extractedAddressesNumber))
                            extractedAddressesNumber = 0;
                        var firstPartAddressDesc = french.detailsPage.knownAddressDescription1;
                        var secondPartAddressDesc = french.detailsPage.knownAddressDescription2;
                        $('#known_address_label').text("");
                        $('#known_address_label').append(firstPartAddressDesc + ' ' + '<label id="numOfAddress" class="numOfList">' + extractedAddressesNumber + '</label>' + ' ' + secondPartAddressDesc);
                        //Hide node's label
                        $('#visualization_hide_node_label span').text(french.detailsPage.hideNodeName);
                        //Hide link's label
                        $('#visualization_hide_link_label span').text(french.detailsPage.hideLinkName);
                        //Tooltip
                        self.tooltipType(french.detailsPage.tooltipType);
                        self.tooltipStatus(french.detailsPage.tooltipStatus);
                        self.tooltipListDetails1(french.detailsPage.tooltipListDetails1);
                        self.tooltipListDetails2(french.detailsPage.tooltipListDetails2);
                        //Overlay Table
                        $('#known_names_table_head').text(french.detailsPage.knownNames);
                        $('#known_addresses_table_head').text(french.detailsPage.knownAddresses);
                        $('#known_names_table_head').text(french.detailsPage.generalInfo);
                    }
                });

                switch (self.lang) {
                    case "en" :
                        self.language("english");
                        break;
                    case "ge" :
                        self.language("german");
                        break;
                    case "fr" :
                        self.language("french");
                        break;
                }


            }, 10);





//////////////////////////////////////////////////////////////////////////// 



        },
        update: function (element, valueAccessor) {

        }
    };

    function testD3ContentViewModel() {
        var self = this;

        self.entid = ko.observable("");
        self.person = ko.observableArray([]);
        self.urlRouter = ko.observableArray([]);
        self.handle = ko.observableArray([]);

        self.handleActivated = function (info) {
            var parentRouter = info.valueAccessor().params.ojRouter.parentRouter;

            self.empRouter = parentRouter.currentState().value;
            var startSubstring = info.element.baseURI.indexOf("lang=") + 5;
            var endSubstring = info.element.baseURI.indexOf("lang=") + 7;
            self.urlRouter(info.element.baseURI.substring(startSubstring, endSubstring));
            self.handle().push(self.urlRouter());

            self.empRouter.configure(function (stateId) {
                var state;
                if (stateId) {
                    var data = stateId.toString();
                    state = new oj.RouterState(data, {
                        value: data,
                        // For each state, before entering the state,
                        // make sure the data for it is loaded.
                        canEnter: function () {
                            // The state transition will be on hold
                            // until loadData is resolved.
                            return self.loadData(data);
                        }
                    });
                }
                return state;
            });

            // Returns the sync promise to handleActivated. The next
            // phase of the ojModule lifecycle (attached) will not be
            // executed until sync is resolved.
            return oj.Router.sync();
        };
        //In order to create an url
        self.url = '/solr/CoreOne/select?indent=on&wt=json';
        self.queryField = ko.observable('&q={!percentage t=QUERY_SIDE f=nam_comp_name}');
        self.fqField = ko.observable('&fq=');

        self.loadData = function (id) {
            return new Promise(function (resolve, reject) {
                $.getJSON(self.url + "&q=" + "ent_id:" + id).then(function (person) {
                    self.person(person);
                    self.entid(id);
                    resolve(true);
                    self.urlRouter();
                    self.handle().push(self.entid());
                    console.log("loadedDataSolr");
                }).fail(function (error) {
                    console.log('Error: ' + error.message);
                    resolve(false);
                });
            });
        };
//        var language = "s"
        //self.empRouter.substring(indexOf("lang="),indexOf("lang=")+2);
//        self.handle = ko.observableArray([language],[self.entid()]);
    }
    return testD3ContentViewModel;

});