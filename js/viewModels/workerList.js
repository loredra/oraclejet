onmessage = function (e) {

    var facets = e.data;
    var formatedFacets = new Array();
    var len = parseInt(facets.length / 2);
    for (var i = 0; i < len; ++i) {
        if (facets[i + 1] !== 0) {
            var name = facets[i];
            var idNameList = name.replace(/[^a-z0-9]/gi, '');
            var hits = facets[i + 1];
            formatedFacets.push({title: name + ", " + hits, attr: {id: idNameList}});
            i = i + 1;
        } else
            break;
    }
    if (formatedFacets.length !== 0)
        var tree = [{"title": "List",
                "attr": {"id": "list"},
                "children": formatedFacets}];
    else 
        var tree = [{"title":"List", "attr":{"id":"list"}}];
    postMessage(tree);

};


