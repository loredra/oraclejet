
/* global d3, tooltip */

define(['ojs/ojcore', 'knockout', 'jquery', 'd3', 'arangodb'
], function (oj, ko, $, d3, arangodb) {

    ko.bindingHandlers.svg = {
        init: function (element, valueAccessor) {

            //In order to use events, functions should be referenced with "self"
            var self = this;

            //Just to test the unwrap function
            var entid = ko.unwrap(valueAccessor());


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
                    queryForTheLinksBetweenEntities = "FOR c IN EntityRelation FILTER c._from==" + "\"" + entity._id + "\"" + " OR c._to==" + "\"" + entity._id + "\"" + " RETURN c";
                    self.searchedEntity(entity);
                    self.searchedEntity();
                }).then(function () {
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

                            self.searchedEntity();
                            self.relatedEntities();

                            root = self.searchedEntity();
                            root.x = width / 2;
                            root.y = height / 2;
                            root.fixed = true;


                            self.linksBetweenEntities().forEach(function (relation) {
                                var source;
                                var target
                                var resultSource = $.grep(self.relatedEntities(), function (e) {
                                    return e._id === relation._from;
                                });
                                resultTarget = $.grep(self.relatedEntities(), function (e) {
                                    return e._id === relation._to;
                                });
                                if (resultSource[0] === undefined)
                                    source = self.searchedEntity();
                                else
                                    source = resultSource[0][0];

                                if (resultTarget[0] === undefined)
                                    target = self.searchedEntity();
                                else
                                    target = resultTarget[0][0];

                                relation["source"] = resultSource[0];
                                relation["target"] = resultTarget[0];

                            });
                            tooltip = d3.select(".tooltip");
                            var linkedByIndex = {};
                            self.linksBetweenEntities().forEach(function (relation) {
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
                                    .data(self.linksBetweenEntities())
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
                                    .attr("markerWidth", 2)
                                    .attr("markerHeight", 2)
                                    .attr("orient", "auto")
                                    .append("path")
                                    .attr("d", "M0,-5L10,0L0,5")
                                    .style("stroke", "#4679BD")
                                    .style("opacity", "0.6");

                            var node = container.append("g").selectAll(".node")
                                    .data(self.relatedEntities())
                                    .enter()
                                    .append("g")
                                    .attr("id", function (d) {
                                        return d._id;
                                    })
                                    .attr("class", "node")
                                    .attr("name", function (d) {
                                        return d.names[0].name;
                                    })
                                    .attr("address", function (d) {
                                        return d.addresses[0].country;
                                    })
                                    .attr("isListedIn", function (d) {
                                        if (d.infos !== null)
                                            if (d.infos.length !== 0)
                                                return d.infos[0].info;
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
                                    .attr("name", function (d) {
                                        return d.names[0].name;
                                    })
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

                            //                            var image_node = node
                            //                                    .append("image")
                            //                                    .attr("class", "node_image")
                            //                                    .attr("xlink:href", function (d) {
                            //                                        return "js/views/resources/" + d.type + ".svg";
                            //                                    })
                            //                                    .attr("x", -12)
                            //                                    .attr("y", -12)
                            //                                    .attr("width", function (d) {
                            //                                        return "24px";
                            //                                    })
                            //                                    .attr("height", function (d) {
                            //                                        return "24px";
                            //                                    });

                            var vis = node
                                    .append("path")
                                    .attr("transform", function (d) {
                                        return "scale(0.1,0.1)";
                                    })
                                    .attr("class", "highlight_circle")
                                    .attr("d", arc)
                                    .attr("opacity", 0);

                            var text = container.append("g").selectAll(".text")
                                    .data(self.relatedEntities())
                                    .enter().append("text")
                                    .attr("class", "text_svg")
                                    .attr("dy", ".35em")
                                    .style("font-size", 13 + "px");

                            text.text(function (d) {
                                return d.names[0].name;
                            })
                                    .style("text-anchor", "middle");


                            force
                                    .nodes(self.relatedEntities())
                                    .links(self.linksBetweenEntities())
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

                            //                            change();

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
                                    tooltip.html(node.name +
                                            "<br>Type: " + node.type +
                                            "<br>Status: <span style='color: " + statusColor + "'>" + node.status + "</span>" +
                                            "<br>Listed in " + node.isListedIn.length + " Sanction Lists");
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
                                            })
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
                            /**/

                        });
                    });
                });








                /*
                 * d3 json
                 */

                /*/
                 d3.json("js/data/pst2.json", function (error, graph) {
                 if (error)
                 throw error;
                 
                 root = graph.nodes[0];
                 root.x = width / 2;
                 root.y = height / 2;
                 root.fixed = true;
                 
                 graph.links.forEach(function (d, i) {
                 d.source = isNaN(d.source) ? d.source : graph.nodes[d.source];
                 d.target = isNaN(d.target) ? d.target : graph.nodes[d.target];
                 });
                 //                    tooltip = d3.select(".tooltip");
                 var linkedByIndex = {};
                 graph.links.forEach(function (d) {
                 linkedByIndex[d.source + "," + d.target] = true;
                 });
                 
                 //container.call(tip);
                 
                 var myScale = d3.scale.linear().domain([0, 100]).range([0, 2 * Math.PI]);
                 
                 var arc = d3.svg.arc()
                 .innerRadius(43)
                 .outerRadius(46)
                 .startAngle(myScale(0))
                 .endAngle(myScale(100));
                 
                 container.attr("transform", "translate(0,0)scale(0.5)");
                 
                 var link = container.append("g").selectAll(".link")
                 .data(graph.links)
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
                 return d.linktype;
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
                 
                 
                 
                 
                 //                    var marker = container.append("g").selectAll("marker")
                 //                            .data(["suit", "licensing", "resolved"])
                 //                            .enter().append("marker")
                 //                            .attr("id", function (d) {
                 //                                return d;
                 //                            })
                 //                            .attr("viewBox", "0 -5 10 10")
                 //                            .attr("refX", 25)
                 //                            .attr("refY", 0)
                 //                            .attr("markerWidth", 2)
                 //                            .attr("markerHeight", 2)
                 //                            .attr("orient", "auto")
                 //                            .append("path")
                 //                            .attr("d", "M0,-5L10,0L0,5")
                 //                            .style("stroke", "#4679BD")
                 //                            .style("opacity", "0.6");
                 
                 var node = container.append("g").selectAll(".node")
                 .data(graph.nodes)
                 .enter()
                 .append("g")
                 .attr("id", function (d) {
                 return d.id;
                 })
                 .attr("class", "node")
                 .attr("name", function (d) {
                 return d.name;
                 })
                 .attr("address", function (d) {
                 return d.address;
                 })
                 .attr("isListedIn", function (d) {
                 if (d.isListedIn !== null)
                 return d.isListedIn;
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
                 .attr("name", function (d) {
                 return d.name;
                 })
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
                 return trust_to_color(d.trust, d.status);
                 });
                 
                 //                    var image_node = node
                 //                            .append("image")
                 //                            .attr("class", "node_image")
                 //                            .attr("xlink:href", function (d) {
                 //                                return "js/views/resources/" + d.type + ".svg";
                 //                            })
                 //                            .attr("x", -12)
                 //                            .attr("y", -12)
                 //                            .attr("width", function (d) {
                 //                                return "24px";
                 //                            })
                 //                            .attr("height", function (d) {
                 //                                return "24px";
                 //                            });
                 
                 var vis = node
                 .append("path")
                 .attr("transform", function (d) {
                 return "scale(0.1,0.1)";
                 })
                 .attr("class", "highlight_circle")
                 .attr("d", arc)
                 .attr("opacity", 0);
                 
                 var text = container.append("g").selectAll(".text")
                 .data(graph.nodes)
                 .enter().append("text")
                 .attr("class", "text_svg")
                 .attr("dy", ".35em")
                 .style("font-size", 13 + "px");
                 
                 text.text(function (d) {
                 return d.name;
                 })
                 .style("text-anchor", "middle");
                 
                 
                 force
                 .nodes(graph.nodes)
                 .links(graph.links)
                 .start();
                 
                 
                 var text_link = container.append("g").selectAll(".text_link_svg")
                 .data(force.links())
                 .enter().append("text")
                 .text(function (d) {
                 return d.linktype;
                 })
                 .attr("class", "text_link_svg")
                 .attr("dy", ".35em")
                 .style("text-anchor", "middle")
                 .style("font-size", 10 + "px");
                 
                 //                    change();
                 
                 //                    node.append("title")
                 //                            .text(function (d) {
                 //                                return d.name;
                 //                            });
                 //
                 //                    info_color_container = d3.select(".svg").append("g")
                 //                            .attr("class", ".info_color_container");
                 //
                 //                    info_color_container.selectAll("g")
                 //                            .data(trustData)
                 //                            .enter()
                 //                            .append("g")
                 //                            .attr("class", ".info_color_list")
                 //                            .attr("data-legend", function (d) {
                 //                                return d.name
                 //                            })
                 
                 
                 //                    var trust = d3.select(".svg").append("g")
                 //                            .attr("id", "trustScore")
                 //                            .attr("transform", "translate(570,-14)");
                 //
                 //                    trust.append("rect")
                 //                            .attr("width", 60 * graph.level_trust.length)
                 //                            .attr("height", 27 * graph.level_trust.length)
                 //                            .style("fill", "#eaf0fa");
                 //
                 //                    var trust_draw = trust.selectAll()
                 //                            .data(graph.level_trust)
                 //                            .enter();
                 //
                 //                    trust_draw.append("text")
                 //                            .attr("transform", function (d, i) {
                 //                                return "translate(22," + 25 * (i + 1) + ")";
                 //                            })
                 //                            .text(function (d) {
                 //                                return d.Message;
                 //                            })
                 //                            .style("fill", "black")
                 //                            .style("dominant-baseline", "central");
                 //
                 //                    trust_draw.append("circle")
                 //                            .attr("r", 10)
                 //                            .attr("transform", function (d, i) {
                 //                                return "translate(10," + 25 * (i + 1) + ")";
                 //                            })
                 //                            .style("fill", function (d) {
                 //                                return d.color;
                 //                            });
                 
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
                 tooltip.html(node.name +
                 "<br>Type: " + node.type +
                 "<br>Status: <span style='color: " + statusColor + "'>" + node.status + "</span>" +
                 "<br>Listed in " + node.isListedIn.length + " Sanction Lists");
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
                 })
                 // .style("stroke",function(d){if(d.linktype=="Subsidiary") return "red";});
                 
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
                 
                 });
                 
                 /**/

                /*
                 * End d3 json
                 */

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
                ;


                function linkToolTip(link) {

                    var text = link.attr("type");
                    tooltip.text(text);
                    tooltip.style("visibility", "visible");
                }
                ;

                function zoomed() {
//     container.attr("transform", "translate(0,0 )scale(1)");
                    container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                }
                ;
                function dragstarted(d) {
                    d3.event.sourceEvent.stopPropagation();
                    d3.select(this).classed("dragging", true);

                }
                ;

                function dragged(d) {
                    root = d;
                    root.fixed = true;
                    d3.select(this).attr("x", d.x = d3.event.x).attr("y", d.y = d3.event.y);
                }
                ;

                function dragended(d) {
                    d3.select(this).classed("dragging", false);
                }
                ;

                function translateBeforeChose(x, y) {
                    var dcx = (width / 2 - x * zoom.scale());
                    var dcy = (height / 2 - y * zoom.scale());
                    zoom.translate([dcx, dcy]);

                    container
                            .transition()
                            .duration(750)
                            .attr("transform", "translate(" + dcx + "," + dcy + ")scale(" + zoom.scale() + ")");
                }
                ;

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
                ;
                function clickImage(node) {
                    //root.fixed = false;

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

///////////////Translte selected node to middle////////////////////////	
                    translateBeforeChose(node.x, node.y);

////////////////////////////Set the node with isChosen yes to bigger/////////////
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
                ;




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
                    detail.select("#name").append("div").text(node.name)
                            .attr("class", "detail_name")
                            .attr("position", "relative");

                    detail.select("#address").append("div").text(node.address)
                            .attr("class", "detail_address")
                            .attr("position", "relative");

                    detail.select("#identification_container").append("div").text(node.Identification)
                            .attr("class", "identification")
                            .attr("position", "relative");

                    detail.select("#country_container").append("div").text(node.country)
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
/////////////////////////Preparing data to populate the list////////////////////////

                    try
                    {
                        listList1 = node.isListedIn;
                        for (var i in listList1) {
                            listList = listList.concat(listList1[i].Name, ",");

                        }
                        // 	listList=node.datum().isListedIn
// 	.each().Name.toString().split(",");
                        listList = listList.slice(0, -1);
                        listList = listList.split(",");
                        if (listList === "")
                            numOfList = 0;
                        else
                            numOfList = listList.length;
                    } catch (err) {
                        numOfList = 0;
                    }
                    d3.select("#numOfList")
                            .text(numOfList);

                    try {
                        var listAKA = node.AKA;
                        numOfAKA = listAKA.length;

                    } catch (err) {
                        numOfAKA = 0;

                    }
                    d3.select("#numOfName")
                            .text(numOfAKA);
                    try {
                        var listKA = node.KnownAddress;
                        numOfAddress = listKA.length;
                        ;
                    } catch (err) {
                        numOfAddress = 0;
                    }

                    d3.select("#numOfAddress").text(numOfAddress);

////////////////////////////////////////////////////////////////////
                    var listOfList = d3.select("#listList").append("ul")
                            .attr("class", "ul_list_List")
                            .selectAll("li")
                            .data(node.isListedIn)
                            .enter()
                            .append("li")
                            .attr("class", "listList")
                            .style("font-size", 15 + "px")
                            .text(function (d) {
                                return d.Name;
                            })
                            .style("text-anchor", "start")
                            .on("click", overlay)
                            .on("mouseover", function (d) {

                                if (d.Expiration !== undefined)
                                    mouseOverList(d.Expiration);
                            })
                            .on("mousemove", mousemove)
                            .on("mouseout", mouseout);


                    var listOfAKA = d3.select("#listAKA").append("ul")
                            .attr("class", "ul_list_List")
                            .selectAll("li")
                            .data(listAKA)
                            .enter()
                            .append("li")
                            .attr("class", "listAKA")
                            .style("font-size", 15 + "px")
                            .text(function (d) {
                                return d;
                            })
                            .style("text-anchor", "start");

                    var listOfKA = d3.select("#listKA").append("ul")
                            .attr("class", "ul_list_List")
                            .selectAll("li")
                            .data(listKA)
                            .enter()
                            .append("li")
                            .attr("class", "listKA")
                            .style("font-size", 15 + "px")
                            .text(function (d) {
                                return d;
                            })
                            .style("text-anchor", "start");
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
//                function click(list) {
//
//                    /////////////////////Return everything in svg to normal///////////////////
//                    vis = d3.selectAll(".highlight_circle");
//
//                    vis.attr("transform", "scale(0.1,0.1)")
//                            .attr("opacity", 0);
//
//                    d3.selectAll(".node").select(".node_image").transition()
//                            .duration(750)
//                            .attr("x", -12)
//                            .attr("y", -12)
//                            .attr("width", "24px")
//                            .attr("height", "24px");
/////////////////////////////////////////////////////////////////////////////
///////////////////////////Making the image bigger///////////////////////////
//                    var node = d3.selectAll(".node")
//                            .filter(function (d) {
//                                return d.id === list.id;
//                            });
//
//                    node.attr("isChosen", "yes")
//                            .select(".node_image")
//                            .transition()
//                            .duration(750)
//                            .attr("x", -20)
//                            .attr("y", -20)
//                            .attr("width", "40px")
//                            .attr("height", "40px");
//
//                    node.select(".highlight_circle")
//                            .transition()
//                            .duration(450)
//                            .attr("transform", "scale(1,1)")
//                            .attr("opacity", 0.7);
//
//                    translateBeforeChose(node.datum().x, node.datum().y);
//
/////////////////First load then color the first node/////////////////////////
//
//                    d3.selectAll("li")
//                            .style("background", "#cce5ff");
//
//                    if (firstLoad) {
//                        d3.select("#list").select("li")
//                                .style("background", "#ffa366");
//                        firstLoad = false;
//                    } else
//                    {
//                        d3.select(this)
//                                .style("background", "#ffa366");
//                    }
/////////////////////////////////////////////////////////////////////////////
//                    populateDetailPage(node.datum());
//
//
//                }
//                
//                //For the data from arangodb
//                console.log("entid is: " + entid);
//                var db = arangodb();
//                db.query("FOR c in Entity FILTER c.id=="+entid+"RETURN c").then(function (entity) {
//                    console.log("entid is: " + entid);
//                    var result = entity._result[0];
//                    var relationid = result._id;
//                    var secondQuery = "FOR c IN EntityRelation FILTER c._from=="+"\""+relationid+"\""+" RETURN c";
//                    db.query(secondQuery).then(function (er) {
//                        var relation = er._result;
////                        var list = d3.select("#list").append("ul").selectAll("li")
////                            .data(relation)
////                            .enter()
////                            .append("li")
//////                            .attr("id", function (d, i) {
//////                                return "index" + i;
//////                            })
//////                            .style("font-size", 15 + "px")
//////                            .text(function (d) {
//////                                return d.name;
//////                            })
//////                            .style("text-anchor", "start")
////                            .on("click", click);
////                    click(d3.select("#list").select("li").datum());
//                    });
//                    
//                });
//                d3.json("js/data/pst2.json", function (error, graph) {
//                    if (error)
//                        throw error;
//                    var list = d3.select("#list").append("ul").selectAll("li")
//                            .data(graph.nodes)
//                            .enter()
//                            .append("li")
//                            .attr("id", function (d, i) {
//                                return "index" + i;
//                            })
//                            .style("font-size", 15 + "px")
//                            .text(function (d) {
//                                return d.name;
//                            })
//                            .style("text-anchor", "start")
//                            .on("click", click);
//                    click(d3.select("#list").select("li").datum());
//                });

            }, 10);



//            $("#visualization").ready(function(){
//                alert("ready visual");
//            });


//////////////////////////////////////////////////////////////////////////// 



        },
        update: function (element, valueAccessor) {

        }
    };

    function testD3ContentViewModel() {
        var self = this;

        //testing svg

        self.entid = ko.observable("");
        self.person = ko.observableArray([]);

        self.handleActivated = function (info) {
            var parentRouter = info.valueAccessor().params.ojRouter.parentRouter;

            self.empRouter = parentRouter.currentState().value;

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
                    console.log("loadData");
                }).fail(function (error) {
                    console.log('Error: ' + error.message);
                    resolve(false);
                });
            });
        };

        self.jsonUrl = ko.observable(self.url + "&q=" + "ent_id" + self.entid());

        //arango db
//        var db = arangodb();
////        var collection = db.collection('Entity');
//        var doc  = db.query("FOR c in Entity RETURN c").then(function(res){
//            console.log("ArangoDB");
//            doc = res;
//        });
//        console.log("after doc")

    }
    return testD3ContentViewModel;

});