
/* global d3, tooltip, german */

define(['ojs/ojcore', 'knockout', 'jquery', 'd3', 'arangodb', 'utils', 'lang/lang.ge', 'lang/lang.en', 'lang/lang.fr', 'knockout-postbox'
], function (oj, ko, $, d3, arangodb, utils) {

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
            
            
            //Observables to store nodes
            self.nodeData = ko.observableArray([]);

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
                        .charge(-7700)
                        .linkDistance(70)
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
                /*
                 * 
                 */

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
                        });

                        //relations = linksBetweenEntities;

                        linksBetweenEntities.forEach(function (newRelation) {
                            var linkExist = $.grep(firstLinks, function (relation) {
                                return relation._id === newRelation._id;
                            });
                            if (linkExist.length === 0) {
                                relations.push(newRelation);
                            }
                            //newRelation["name"] = newRelation.names[0].name;
                        });

                        // entities = relatedEntities;

                        relatedEntities.forEach(function (newEntity) {
                            newEntity["name"] = newEntity.names[0].name;
                            var entityExist = $.grep(firstNodes, function (relatedEntity) {
                                return newEntity._id === relatedEntity._id;
                            });
                            if (entityExist.length === 0) {
                                entities.push(newEntity);
                            }

                        });

                        relations = linksBetweenEntities;
                        entities = relatedEntities;

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
                                return d.relationType;
                            })
                            .on("mouseover", function (d) {
                                linkToolTip(d3.select(this));
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
                                var name = "";
                                if (d.names)
                                    if (d.names.length !== 0)
                                        d.names.forEach(function (n) {
                                            if (isASCII(n.name)) {
                                                name = n.name;
                                            }
                                        });
                                //name = d.names[0].name;
                                return name;
                            })
                            .attr("address", function (d) {
                                return d.addresses[0].country;
                            })
                            .attr("isListedIn", function (d) {
                                if (d.sanctionName !== null)
                                    return d.sanctionName;
                                else
                                    return "";
                            })
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
                                name = node.names[0].name;
                            var numberLists;
                            if (node.infos === undefined)
                                numberLists = 0;
                            else
                                numberLists = node.infos.length;
                            tooltip.html(node.names[0].name +
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
                            .data(relatedEntities)
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

                /*
                 * 
                 */

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

                function linkToolTip(link) {

                    var text = link.attr("type");
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

                    //creating new trees
                    if (d3.event.shiftKey) {
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
                                    //Remove the nodes before. For some reason d3, on updating, duplicates the graph.    
                                    container.selectAll("*").remove();
                                    d3.select("#list").selectAll("li").remove();
                                    //Update
                                    updating = true;
                                    self.createGraphAndAddInfo([node], newLinks, newEntities);
                                });
                        });
                        return;
                    }
                    if (d3.event.defaultPrevented)
                        return;
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
                    d3.select(".detail_name").remove();
                    d3.select(".detail_address").remove();
                    d3.select(".identification").remove();
                    d3.select(".country").remove();
                    d3.selectAll(".ul_list_List").remove();


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

                    detail.select("#name").append("div").text(nodename)
                            .attr("class", "detail_name")
                            .attr("position", "relative");

                    var nodeAddress;
                    var detailAddress = "";
                    if (node.addresses === undefined)
                        nodeAddress = "";
                    else if (node.addresses.length === 0)
                        nodeAddress = "";
                    else {
                        nodeAddress = node.addresses[0];
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
                                        detailAddress = detailAddress + " ," + nodeAddress.appartment;
                                    else
                                        detailAddress = nodeAddress.appartment;
                                if (nodeAddress.floor)
                                    if (detailAddress !== "")
                                        detailAddress = detailAddress + " ," + nodeAddress.floor;
                                    else
                                        detailAddress = nodeAddress.floor;
                                if (nodeAddress.building)
                                    if (detailAddress !== "")
                                        detailAddress = detailAddress + " ," + nodeAddress.building;
                                    else
                                        detailAddress = nodeAddress.building;
                                if (nodeAddress.house)
                                    if (detailAddress !== "")
                                        detailAddress = detailAddress + " ," + nodeAddress.house;
                                    else
                                        detailAddress = nodeAddress.house;
                                if (nodeAddress.street)
                                    if (detailAddress !== "")
                                        detailAddress = detailAddress + " ," + nodeAddress.street;
                                    else
                                        detailAddress = nodeAddress.street;
                                if (nodeAddress.district)
                                    if (detailAddress !== "")
                                        detailAddress = detailAddress + " ," + nodeAddress.district;
                                    else
                                        detailAddress = nodeAddress.district;
                                if (nodeAddress.city)
                                    if (detailAddress !== "")
                                        detailAddress = detailAddress + " ," + nodeAddress.city;
                                    else
                                        detailAddress = nodeAddress.city;
                            }

                            if (nodeAddress.zipcode)
                                if (detailAddress !== "")
                                    detailAddress = detailAddress + " ," + nodeAddress.zipcode;
                                else
                                    detailAddress = nodeAddress.zipcode;

                            if (nodeAddress.state)
                                if (detailAddress !== "")
                                    detailAddress = detailAddress + " ," + nodeAddress.state;
                                else
                                    detailAddress = nodeAddress.state;
                            if (nodeAddress.country)
                                if (detailAddress !== "")
                                    detailAddress = detailAddress + " ," + nodeAddress.country;
                                else
                                    detailAddress = nodeAddress.country;
                        }



                    }
                    detail.select("#address").append("div").text(detailAddress)
                            .attr("class", "detail_address")
                            .attr("position", "relative");

                    detail.select("#identification_container").append("div").text(node.id)
                            .attr("class", "identification")
                            .attr("position", "relative");

                    detail.select("#country_container").append("div").text(nodeAddress.country)
                            .attr("class", "country")
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

////////////////////////////////////////////////////////////////////
                    var listOfList = d3.select("#listList").append("tr")
                            .attr("class", "ul_list_List")
                            .selectAll("tr")
                            .data([node])
                            .enter()
                            .append("tr")
                            .attr("class", "listList")
                            .style("font-size", 15 + "px")
                            .text(node.sanctionName)
                            .style("text-anchor", "start")
                            .on("click", overlayTable)
                            .on("mouseover", function () {
                                if (node.validto !== undefined)
                                    mouseOverList(node.validto);
                            })
                            .on("mousemove", mousemove)
                            .on("mouseout", mouseout);

                    var listOfAKA = d3.select("#listAKA").append("tr")
                            .attr("class", "ul_list_List")
                            .selectAll("tr")
                            .data(listAKA)
                            .enter()
                            .append("tr")
                            .attr("class", "listAKA")
                            .style("font-size", 15 + "px")
                            .text(function (d) {
                                return d.name;
                            })
                            .style("text-anchor", "start");

//                    var listOfAKA = d3.select("#listAKA").append("td")
//                            .attr("class", "ul_list_List")
//                            .selectAll("tr")
//                            .data(listAKA)
//                            .enter()
//                            .append("tr")
//                            .attr("class", "listAKA")
//                            .style("font-size", 15 + "px")
//                            .text(function (d) {
//                                return d.name;
//                            })
//                            .style("text-anchor", "start");

                    var listOfKA = d3.select("#listKA").append("tr")
                            .attr("class", "ul_list_List")
                            .selectAll("tr")
                            .data(listKA)
                            .enter()
                            .append("tr")
                            .attr("class", "listKA")
                            .style("font-size", 15 + "px")
                            .text(function (d) {
                                return d.country;
                            })
                            .style("text-anchor", "start");
                }

                function overlayTable() {
                    var table = d3.select('#overlayTableContainer').append('table');
                    
                    var tr = table.selectAll('tr')
                            .data(self.nodeData())
                            .enter()
                            .append('tr');
                    
                    tr.append('td').html(function(node) {
                        return node; 
                    });
                }


                function overlay() {
                    el = d3.select("#overlay");
                    el
                            .style("visibility",
                                    (el.style("visibility") === "visible") ? "hidden" : "visible")
                            .on("click", closeOverlay);
                    ;

                    el.select(".close")
                            .on("click", closeOverlay);

                }

                function closeOverlay() {

                    el = d3.select("#overlay");
                    d3.select(".close")
                            .on("click", el.style("visibility", "hidden"));

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
                        var firstPartListDesc = german.detailsPage.sanctionListsDescription1;
                        var secondPartListDesc = german.detailsPage.sanctionListsDescription2;
                        $('#sanction_lists_label').text("");
                        $('#sanction_lists_label').append(firstPartListDesc + ' ' + '<label id="numOfList" class="numOfList">' + extractedListsNumber + '</label>' + ' ' + secondPartListDesc);
                        //Known Names Description
                        var extractedNamesNumber = parseInt($('#numOfName').text());
                        var firstPartNamesDesc = german.detailsPage.knownNamesDescription1;
                        var secondPartNamesDesc = german.detailsPage.knownNamesDescription2;
                        $('#also_known_as_label').text("");
                        $('#also_known_as_label').append(firstPartNamesDesc + ' ' + '<label id="numOfName" class="numOfList">' + extractedNamesNumber + '</label>' + ' ' + secondPartNamesDesc);
                        //
                        //Known Addresses Description
                        var extractedAddressesNumber = parseInt($('#numOfAddress').text());
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
                    } else if (selectedLanguage === "english") {
                        //First part
                        $('#name_label').text(english.detailsPage.name);
                        $('#address_label').text(english.detailsPage.primaryAddress);
                        $('#identification_label').text(english.detailsPage.identification);
                        $('#country_label').text(english.detailsPage.country);
                        //Second Part
                        //Sanction Lists Description
                        var extractedListsNumber = parseInt($('#numOfList').text());
                        var firstPart = english.detailsPage.sanctionListsDescription1;
                        var secondPart = english.detailsPage.sanctionListsDescription2;
                        $('#sanction_lists_label').text("");
                        $('#sanction_lists_label').append(firstPart + ' ' + '<label id="numOfList" class="numOfList">' + extractedListsNumber + '</label>' + ' ' + secondPart);
                        //Known Names Description
                        var extractedNamesNumber = parseInt($('#numOfName').text());
                        var firstPartNamesDesc = english.detailsPage.knownNamesDescription1;
                        var secondPartNamesDesc = english.detailsPage.knownNamesDescription2;
                        $('#also_known_as_label').text("");
                        $('#also_known_as_label').append(firstPartNamesDesc + ' ' + '<label id="numOfName" class="numOfList">' + extractedNamesNumber + '</label>' + ' ' + secondPartNamesDesc);
                        //Known Addresses Description
                        var extractedAddressesNumber = parseInt($('#numOfAddress').text());
                        var firstPartAddressDesc = english.detailsPage.knownAddressDescription1;
                        var secondPartAddressDesc = english.detailsPage.knownAddressDescription2;
                        $('#known_address_label').text("");
                        $('#known_address_label').append(firstPartAddressDesc + ' ' + '<label id="numOfAddress" class="numOfList">' + extractedAddressesNumber + '</label>' + ' ' + secondPartAddressDesc);
                        //Hide node's label
                        $('#visualization_hide_node_label span').text(english.detailsPage.hideNodeName);
                        //Hide link's label
                        $('#visualization_hide_link_label span').text(english.detailsPage.hideLinkName);
                        //Tooltip
                        self.tooltipType(german.detailsPage.tooltipType);
                        self.tooltipStatus(german.detailsPage.tooltipStatus);
                        self.tooltipListDetails1(german.detailsPage.tooltipListDetails1);
                        self.tooltipListDetails2(german.detailsPage.tooltipListDetails2);
                    } else if (selectedLanguage === "french") {
                        //First part
                        $('#name_label').text(french.detailsPage.name);
                        $('#address_label').text(french.detailsPage.primaryAddress);
                        $('#identification_label').text(french.detailsPage.identification);
                        $('#country_label').text(french.detailsPage.country);
                        //Second Part
                        //Sanction Lists Description
                        var extractedListsNumber = parseInt($('#numOfList').text());
                        var firstPart = french.detailsPage.sanctionListsDescription1;
                        var secondPart = french.detailsPage.sanctionListsDescription2;
                        $('#sanction_lists_label').text("");
                        $('#sanction_lists_label').append(firstPart + ' ' + '<label id="numOfList" class="numOfList">' + extractedListsNumber + '</label>' + ' ' + secondPart);
                        //Known Names Description
                        var extractedNamesNumber = parseInt($('#numOfName').text());
                        var firstPartNamesDesc = french.detailsPage.knownNamesDescription1;
                        var secondPartNamesDesc = french.detailsPage.knownNamesDescription2;
                        $('#also_known_as_label').text("");
                        $('#also_known_as_label').append(firstPartNamesDesc + ' ' + '<label id="numOfName" class="numOfList">' + extractedNamesNumber + '</label>' + ' ' + secondPartNamesDesc);
                        //Known Addresses Description
                        var extractedAddressesNumber = parseInt($('#numOfAddress').text());
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