function foundDouble(arr, elem, newHits) {
    var result = -1;
    var node, arrEl, hits;
    for (var i = 0; i < arr.length; ++i) {
        if (elem.indexOf(" (") === -1)
            node = elem;
        else
            node = elem.substring(0, elem.indexOf(" ("));
        if (arr[i].indexOf("(") === -1)
            hits = 0;
        else
            hits = parseInt(arr[i].substring(arr[i].indexOf("(") + 1, arr[i].length - 1));

        if (arr[i].indexOf(" (") === -1)
            arrEl = arr[i];
        else
            arrEl = arr[i].substring(0, arr[i].indexOf(" ("));
        if (node === arrEl) {
            if (hits === newHits) {
                result = 0;
                break;
            } else if (newHits === 0)
                result = 0;
            else
                result = 10;
        }

    }
    return result;
}
function removeNoHits(arr, elem) {
    var arrEl;
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].indexOf(" (") === -1)
            arrEl = arr[i];
        else
            arrEl = arr[i].substring(0, arr[i].indexOf(" ("));
        if (arrEl === elem) {
            arr.splice(i, 1);
            break;
        }
    }
    return arr;
}

function remove(obj, elem) {
    for (var i = 0; i < obj.length; i++) {
        if (obj[i].id === elem.id) {
            obj.splice(i, 1);
            break;
        }
    }
    return obj;
}

function setText(obj, elem, hits) {
    for (var i = 0; i < obj.length; i++) {
        if (obj[i].id === elem.id) {
            obj[i].text = obj[i].text + " (" + hits + ")";
            break;
        }
    }
    return obj;
}
function restructure(temp, tree) {
    var restructured = JSON.parse(JSON.stringify(tree));
    for (var i = 0; i < tree.length; ++i) {
        var node;
        var hits;
        var found = false;
        var aux;
        for (var t = 0; t < temp.length; ++t) {
            aux = JSON.parse(JSON.stringify(temp));
            if (temp[t].indexOf(" (") === -1)
                node = temp[t];
            else
                node = temp[t].substring(0, temp[t].indexOf(" ("));
            if (temp[t].indexOf(" (") === -1)
                hits = 0;
            else
                hits = parseInt(temp[t].substring(temp[t].indexOf("(") + 1, temp[t].length - 1));
            var treeid = tree[i].id;
            if (node === tree[i].id) {
                found = true;
                //aux.splice(i, 1);
                break;
            }
        }
        temp = JSON.parse(JSON.stringify(aux));
        if (!found) {
            var rem = tree[i].id
            restructured = remove(restructured, tree[i]);
            //tree.splice(i,1);
        } else if (hits !== 0)
            restructured = setText(restructured, tree[i], hits);
    }
    return restructured;
}

onmessage = function (e) {
    var pointer = new Array();
    var splitted;
    var treeStructure = [
        {
            "text": "Type",
            "id": "type",
            "state": {"opened": true},
            "children": [{
                    "text": "General",
                    "id": "ENTITY_GENERAL",
                    "state": {"opened": true},
                    "children": [{
                            "text": "Individual",
                            "id": "ENTITY_INDIVIDUAL",
                            "children": {
                            },
                        },
                        {
                            "text": "Entity",
                            "id": "ENTITY_ENTITY",
                            "children": [{
                                    "text": "Company",
                                    "id": "ENTITY_COMPANY",
                                    "children": [{
                                            "text": "Bank",
                                            "id": "ENTITY_BANK",
                                            "children": {
                                            }
                                        }]
                                }, {
                                    "text": "Organization",
                                    "id": "ENTITY_ORGANIZATION",
                                    "children": {
                                    }
                                }, {
                                    "text": "Company Record",
                                    "id": "ENTITY_CR_RECORD",
                                    "children": {
                                    }
                                },
                                {
                                    "text": "PSTAG Record",
                                    "id": "ENTITY_PSTAG_RECORD",
                                    "children": {
                                    }
                                }]
                        },
                        {
                            "text": "Vessel",
                            "id": "ENTITY_VESSEL",
                            "children": {
                            }
                        }]
                }],
        }
    ];
    var structure = [
        {"id": "ENTITY_GENERAL", "parent": "#", "text": "General", "state": {"opened": true}},
        {"id": "ENTITY_INDIVIDUAL", "parent": "ENTITY_GENERAL", "text": "Individual"},
        {"id": "ENTITY_ENTITY", "parent": "ENTITY_GENERAL", "text": "Entity", "state": {"opened": true}},
        {"id": "ENTITY_VESSEL", "parent": "ENTITY_GENERAL", "text": "Vessel"},
        {"id": "ENTITY_COMPANY", "parent": "ENTITY_ENTITY", "text": "Company", "state": {"opened": true}},
        {"id": "ENTITY_BANK", "parent": "ENTITY_COMPANY", "text": "Bank"},
        {"id": "ENTITY_ORGANIZATION", "parent": "ENTITY_ENTITY", "text": "Organization"},
        {"id": "ENTITY_CR_RECORD", "parent": "ENTITY_ENTITY", "text": "Company Record"},
        {"id": "ENTITY_PSTAG_RECORD", "parent": "ENTITY_ENTITY", "text": "PSTAG Record"}
    ];



    var restructured;
    //restructured = [{"id": "type", "parent": "#", "text": "Type", "state": {"opened": true}}];
    var temp = new Array();
    var facets = e.data;
//    console.log(facets);
    var formatedFacets = new Array();
    if (facets.length !== 0) {
        var len = (parseInt(facets.length / 2) + 2);
        for (var i = 0; i < len; ++i) {
            if (facets[i + 1] !== 0) {
                var name = facets[i];
                if (name !== "null") {
                    splitted = name.split("/");
                    var hits = facets[i + 1];
                    var node;
                    var parent;
                    for (var s = 0; s < splitted.length; ++s) {
                        if (s !== (splitted.length - 1))
                            var newHits = 0;
                        else
                            var newHits = hits;

                        if (foundDouble(temp, splitted[s], newHits) === -1) {
                            if (s === (splitted.length - 1))
                                temp.push(splitted[s] + " (" + hits + ")");
//                            else if(hits !== 0)
//                                temp.push(splitted[s] + " (" + hits + ")");
                            else
                                temp.push(splitted[s]);
                        } else if (foundDouble(temp, splitted[s], newHits) === 10) {
                            temp = removeNoHits(temp, splitted[s]);
                            if (s === (splitted.length - 1))
                                temp.push(splitted[s] + " (" + hits + ")");
                            else
                                temp.push(splitted[s]);
                        }
                    }

                }
                i = i + 1;
            } else
                break;
        }

        var restructured = restructure(temp, structure);
        
        //restructured.push(restructuredTree);

        if (formatedFacets.length !== 0)
            var tree = [{"title": "Type",
                    "id": "type",
                    "children": treeStructure}];
        else
            var tree = [{"title": "Type", "attr": {"id": "type"}}];
        postMessage(restructured);
    }
}

