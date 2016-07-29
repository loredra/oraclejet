//onmessage = function (e) {
//
//    var facets = e.data;
//    var formatedFacets = new Array();
//    var len = parseInt(facets.length / 2);
//    for (var i = 0; i < len; ++i) {
//        if (facets[i + 1] !== 0) {
//            var name = facets[i];
//            if(name !== "null"){
//            var hits = facets[i + 1];
//            formatedFacets.push({title: name + ", " + hits, attr: {id: facets[i]}});
//        }
//            i = i + 1;
//        } else
//            break;
//    }
//    if (formatedFacets.length !== 0)
//        var tree = [{"title": "Country",
//                "attr": {"id": "country"},
//                "children": formatedFacets}];
//    else 
//        var tree = [{"title":"Country", "attr":{"id":"country"}}];
//    postMessage(tree);
//
//};

onmessage = function (e) {

    var facets = e.data;
    var formatedFacets = new Array();
    formatedFacets=[{"id": "country", "parent": "#", "text": "Country", "state": {"opened": true} }];
    var len = parseInt(facets.length / 2);
    for (var i = 0; i < len; ++i) {
        if (facets[i + 1] !== 0) {
            var name = facets[i];
            if (name !== "null") {
                var hits = facets[i + 1];
                formatedFacets.push({id: facets[i] ,parent: "country", text: name + " (" + hits + ")"});
            }
            i = i + 1;
        } else
            break;
    }
    if (formatedFacets.length !== 0) {
        var tree = [{"text": "Country",
                "id": "country",
                "state": {"opened": true},
                "parent": "#"}];
        tree.push(formatedFacets[0]);
    } else
        var tree = [{"text": "Country", "id": "country", "parent": "#"}];
    postMessage(formatedFacets);

};