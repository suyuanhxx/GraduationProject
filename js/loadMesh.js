/**
 * Created by Huangxiaoxu on 3/13/2015.
 */
function loadTriMesh(loader, material) {
    var lines = loader().children[0].children[0].attributes.Vertex.elements;
    var lineGeo = new THREE.Geometry();
    var i = 0;
    for (i=0; i<lines.length; i+=3) {
        lineGeo.vertices.push(
            new THREE.Vertex(
                new THREE.Vector3(lines[i], lines[i+1], lines[i+2])
            )
        );
    }
    for (i=0; i<lines.length/3; i+=3) {
        lineGeo.faces.push(new THREE.Face3(i, i+1, i+2, null, null));
    }
    lineGeo.computeCentroids();
    lineGeo.computeFaceNormals();
    lineGeo.computeVertexNormals();
    lineGeo.computeBoundingSphere();
    var lineMesh = new THREE.Mesh(lineGeo, material);
    lineMesh.type = THREE.Triangles;
    lineMesh.scale.x = lineMesh.scale.y = lineMesh.scale.z = 0.0000319;
    lineMesh.rotation.x = -Math.PI/2;
    lineMesh.rotation.z = Math.PI;
    lineMesh.matrixAutoUpdate = false;
    lineMesh.doubleSided = true;
    lineMesh.updateMatrix();
    return lineMesh;
}

function loadLineMesh(loader, material) {
    var lines = loader().children[0].children[0].attributes.Vertex.elements;
    var lineGeo = new THREE.Geometry();
    for (var i=0; i<lines.length; i+=3) {
        lineGeo.vertices.push(new THREE.Vertex(new THREE.Vector3(lines[i], lines[i+1], lines[i+2])));
    }
    var lineMesh = new THREE.Line(lineGeo, material);
    lineMesh.type = THREE.Lines;
    lineMesh.scale.x = lineMesh.scale.y = lineMesh.scale.z = 0.0000318;
    lineMesh.rotation.x = -Math.PI/2;
    lineMesh.rotation.z = Math.PI;
    lineMesh.matrixAutoUpdate = false;
    lineMesh.updateMatrix();
    return lineMesh;
}