var loadLineMesh = function(loader, material) {
    var coords = loader().children[0].children[0].attributes.Vertex.elements;
    var lines = [];
    for (i=0; i<coords.length; i+=3) {
        lines.push(new THREE.Vector3(coords[i], coords[i+1], coords[i+2]));
    }
    lines = spherizeLines(lines, 1/64);
    var lineGeo = new THREE.Geometry();
    for (var i=0; i<lines.length; i++) {
        lineGeo.vertices.push(lines[i]);
    }
    var lineMesh = new THREE.Line(lineGeo, material);
    lineMesh.type = THREE.Lines;
    lineMesh.scale.x = lineMesh.scale.y = lineMesh.scale.z = 0.00003155;
    lineMesh.rotation.x = -Math.PI/2;
    lineMesh.rotation.z = Math.PI;
    lineMesh.matrixAutoUpdate = false;
    lineMesh.updateMatrix();
    return lineMesh;
};

var loadTriMesh = function(loader, material) {
    var coords = loader().children[0].children[0].attributes.Vertex.elements;
    var lineGeo = new THREE.Geometry();
    var i = 0;
    var lines = [];
    for (i=0; i<coords.length; i+=3) {
        lines.push(new THREE.Vector3(coords[i], coords[i+1], coords[i+2]));
    }
    lines = spherizeTris(lines, 1/64);
    for (i=0; i<lines.length; i++) {
        lineGeo.vertices.push(lines[i]);
    }
    for (i=0; i<lines.length; i+=3) {
        lineGeo.faces.push(new THREE.Face3(i, i+1, i+2, null, null));
    }
    lineGeo.computeFaceNormals();
    lineGeo.computeVertexNormals();
    lineGeo.computeBoundingSphere();
    var lineMesh = new THREE.Mesh(lineGeo, material);
    lineMesh.type = THREE.Triangles;
    lineMesh.scale.x = lineMesh.scale.y = lineMesh.scale.z = 0.0000315;
    lineMesh.rotation.x = -Math.PI/2;
    lineMesh.rotation.z = Math.PI;
    lineMesh.matrixAutoUpdate = false;
    lineMesh.doubleSided = true;
    lineMesh.updateMatrix();
    return lineMesh;
};

var splitTri = function(u, v, w, maxLength) {
    var d, parts, plen, nd, tris, i;
    var tmpV0 = new THREE.Vector3();
    var tmpV1 = new THREE.Vector3();
    var tmpV2 = new THREE.Vector3();
    d = tmpV0.subVectors(v, u);
    var len = d.length();
    if (len > maxLength*1.1) {
        parts = Math.max(2, Math.ceil(len / maxLength));
        plen = len / parts;
        nd = d.normalize();
        tris = [];
        for (i=0; i<parts; i++) {
            tmpV1.copy(nd);
            tmpV1.multiplyScalar(plen*i);
            tmpV1.add(u);
            tmpV2.copy(nd);
            tmpV2.multiplyScalar(plen*(i+1));
            tmpV2.add(u);
            tris = tris.concat(splitTri(tmpV1.clone(), tmpV2.clone(), w, maxLength));
        }
        return tris;
    } else if (d.subVectors(w,v).length() > maxLength*1.1) {
        return splitTri(v, w, u, maxLength);
    } else if (d.subVectors(w,u).length() > maxLength*1.1) {
        return splitTri(w, u, v, maxLength);
    }

    return [u,v,w];
};

var splitLine = function(u, v, maxLength) {
    var d, parts, plen, nd, lines, i;
    var tmpV0 = new THREE.Vector3();
    var tmpV1 = new THREE.Vector3();
    var tmpV2 = new THREE.Vector3();
    d = tmpV0.subVectors(v, u);
    var len = d.length();
    if (len > maxLength*1.1) {
        parts = Math.max(2, Math.ceil(len / maxLength));
        plen = len / parts;
        nd = d.normalize();
        lines = [];
        for (i=0; i<parts; i++) {
            tmpV1.copy(nd);
            tmpV1.multiplyScalar(plen*i);
            tmpV1.add(u);
            tmpV2.copy(nd);
            tmpV2.multiplyScalar(plen*(i+1));
            tmpV2.add(u)
            lines.push(tmpV1.clone(), tmpV2.clone());
        }
        return lines;
    }
    return [u,v];
};

var spherizeVertsInPlace = function(verts, radius) {
    var t = verts;
    for (var i=0; i<t.length; i++) {
        t[i].multiplyScalar(radius/t[i].length());
    }
    return t;
};

var spherizeTris = function(triVerts, maxLength) {
    var newVerts = [];
    var t = triVerts;
    var radius = t[0].length();
    maxLength *= 2*Math.PI*radius;
    for (var i=0; i<t.length; i+=3) {
        var arr = splitTri(t[i], t[i+1], t[i+2], maxLength);
        spherizeVertsInPlace(arr, radius);
        for (var j=0; j<arr.length; j++) {
            newVerts.push(arr[j]);
        }
    }
    return newVerts;
};

var spherizeLines = function(lineVerts, maxLength) {
    var newVerts = [];
    var t = lineVerts;
    var radius = t[0].length();
    maxLength *= 2*Math.PI*radius;
    for (var i=0; i<t.length; i+=2) {
        var arr = splitLine(t[i], t[i+1], maxLength);
        spherizeVertsInPlace(arr, radius);
        for (var j=0; j<arr.length; j++) {
            newVerts.push(arr[j]);
        }
    }
    return newVerts;
};
