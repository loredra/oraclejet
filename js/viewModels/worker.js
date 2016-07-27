onmessage = function (e) {

    var facets = e.data;
    var formatedFacets = new Array();
    var len = parseInt(facets.length / 2);
    for (var i = 0; i < len; ++i) {
        if (facets[i + 1] !== 0) {
            var name = facets[i];
            if(name !== "null"){
            var hits = facets[i + 1];
            formatedFacets.push({title: name + ", " + hits, attr: {id: facets[i]}});
        }
            i = i + 1;
        } else
            break;
    }
    if (formatedFacets.length !== 0)
        var tree = [{"title": "Country",
                "attr": {"id": "country"},
                "children": formatedFacets}];
    else 
        var tree = [{"title":"Country", "attr":{"id":"country"}}];
    postMessage(tree);

};