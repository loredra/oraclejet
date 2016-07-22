
function setChildren(tree, parent,  list, hits, iteration) {
    var result = new Array();
    var children = new Array();
    if (list[iteration]) {

        children.push({
            title: list[iteration] + ", " + hits,
            attr: {id: list[iteration]}
        });
        parent[0]["children"] = JSON.parse(JSON.stringify(children));
        tree.push(JSON.parse(JSON.stringify(parent[0])));
        if(tree.length > 1){
            tree[0].children[0]["children"] = JSON.parse(JSON.stringify(tree[1].children));
            tree.pop(tree[1]);
        }
            
        setChildren(tree, parent[0].children,  list, hits, iteration + 1);

    }
    result = JSON.parse(JSON.stringify(tree));
    return result;
};

onmessage = function (e) {
    var pointer = new Array();
    var splitted;

    var facets = e.data;
    var formatedFacets = new Array();
    var len = parseInt(facets.length / 2);
    for (var i = 0; i < len; ++i) {
        if (facets[i + 1] !== 0) {
            var name = facets[i];
            if (name !== "null") {
                splitted = name.split("/");
                var hits = facets[i + 1];
                var arr = new Array();
                arr.push({
                    title: splitted[0] + ", " + hits,
                    attr: {id: splitted[0]}
                });
                var childrenNode = new Array();
                var tree = new Array();
                try{
                    tree = JSON.parse(JSON.stringify(setChildren([],arr, splitted, hits, 1)));
                }
                //node = JSON.parse(JSON.stringify(arr));
                /*
                 for (var k = 0; k < splitted.length; ++k) {
                 var children = new Array();
                 if (splitted[k + 1]) {
                 var next = k + 1;
                 children.push({
                 title: splitted[next] + ", " + hits,
                 attr: {id: splitted[next]}
                 });
                 
                 
                 if (k === 0) {
                 childrenNode = JSON.parse(JSON.stringify(arr[0]));
                 }
                 if (childrenNode.children === undefined) {
                 childrenNode["children"] = JSON.parse(JSON.stringify(children[0]));
                 childrenNode = JSON.parse(JSON.stringify(childrenNode.children));
                 arr[0]["children"] = JSON.parse(JSON.stringify(childrenNode.children));
                 }
                 }
                 }
                 */ 
                finally{
                    formatedFacets.push(JSON.parse(JSON.stringify(tree)));
                }
            }
            i = i + 1;
        } else
            break;
    }
    if (formatedFacets.length !== 0)
        var tree = [{"title": "Type",
                "attr": {"id": "type"},
                "children": formatedFacets}];
    else
        var tree = [{"title": "Type", "attr": {"id": "type"}}];
    postMessage(tree);

}

