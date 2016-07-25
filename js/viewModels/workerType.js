function find(source, id)
{
    for (key in source)
    {
        var item = source[key];
        if (item.id == id)
            return item;

        // Item not returned yet. Search its children by recursive call.
        if (item.children)
        {
            var subresult = find(item.children, id);

            // If the item was found in the subchildren, return it.
            if (subresult)
                return subresult;
        }
    }
    // Nothing found yet? return null.
    return null;
}

function setChildren(tree, parent, list, hits, iteration) {
    var result = new Array();
    var children = new Array();
    if (list[iteration]) {

        children.push({
            title: list[iteration] + ", " + hits,
            attr: {id: list[iteration]}
        });
        parent["children"] = JSON.parse(JSON.stringify(children));
        tree.push(JSON.parse(JSON.stringify(parent)));
        if (tree.length > 1) {
            tree[0].children[0]["children"] = JSON.parse(JSON.stringify(tree[1].children));
            tree.pop(tree[1]);
        }

        setChildren(tree, parent.children[0], list, hits, iteration + 1);

    }
    result = JSON.parse(JSON.stringify(tree));
    return result;
}

function addNode(object, tree, parent) {
//    if(find(tree, parent.id) === null){
//        
//    }

    //The string filter should be applied to place the node inside the tree
    return tree;
}

function checkObject(object, tree, parent) {
    if (find(tree, object.id) === null) {
        if (object.children !== undefined) {
            parent = object[0];
            checkObject(object.children[0], tree, parent);
        }
    } else
        var updatedTree = addNode(object, tree, parent);

    return updatedTree;

}

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
//                arr.push({
//                    title: splitted[0] + ", " + hits,
//                    id: splitted[0]
//                });

                arr.push({
                    title: splitted[0] + ", " + hits,
                    id: splitted[0]
                });
                var childrenNode = new Array();
                var tree = new Array();
                try {
                    tree = JSON.parse(JSON.stringify(setChildren([], arr[0], splitted, hits, 1)));
                } finally {
                    formatedFacets.push(JSON.parse(JSON.stringify(tree)));
                }
            }
            i = i + 1;
        } else
            break;
    }

    //Build tree
    if (formatedFacets[0] !== undefined) {
        var treeStructure = formatedFacets[0];
        for (var i = 1; i < formatedFacets.length; ++i) {
            if (formatedFacets[i][0] !== undefined)
//                if (find(treeStructure[0], formatedFacets[i][0].id) !== null)
                checkObject(formatedFacets[i][0], treeStructure[0], [])
        }
    }


    if (formatedFacets.length !== 0)
        var tree = [{"title": "Type",
                "id": "type",
                "children": formatedFacets}];
    else
        var tree = [{"title": "Type", "attr": {"id": "type"}}];
    postMessage(tree);

}

