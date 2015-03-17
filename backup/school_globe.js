/**
 * dat.globe Javascript WebGL Globe Toolkit
 * http://dataarts.github.com/dat.globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 **/

var DAT = DAT || {};

DAT.Globe = function(container, opts) {
  opts = opts || {};

  var colorFn = opts.colorFn || function(x) {
        var c = new THREE.Color();
        c.setHSL( ( 0.6 - ( x * 0.5 ) ), 1.0, 0.5 );
        return c;
      };

  var Shaders = {
    'earth' : {
      uniforms: {
        'texture': { type: 't', value: null }
      },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        'vNormal = normalize( normalMatrix * normal );',
        'vUv = uv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D texture;',
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
        'vec3 diffuse = vec3(1.0)-texture2D( texture, vUv ).xyz;',
        'float intensity = pow(1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), 4.0);',
        'float i = 0.8-pow(clamp(dot( vNormal, vec3( 0, 0, 1.0 )), 0.0, 1.0), 1.5);',
        'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * intensity;',
        'float d = clamp(pow(max(0.0,(diffuse.r-0.062)*10.0), 2.0)*5.0, 0.0, 1.0);',
        'gl_FragColor = vec4( /*(d*vec3(i)) + ((1.0-d)*diffuse)*/ diffuse + atmosphere, 1.0 );',
        '}'
      ].join('\n')
    },
    'continents' : {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
        'vec4 pos = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        'vNormal = normalize( normalMatrix * normalize( position ));',
        'gl_Position = pos;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
        'float i = 0.8-pow(clamp(dot( vNormal, vec3( 0, 0, 1.0 )), 0.0, 1.0), 0.7);',
        'gl_FragColor = vec4(i);',
        'gl_FragColor.a = 1.0;',
        '}'
      ].join('\n')
    },
    'atmosphere' : {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
        'vNormal = normalize( normalMatrix * normal );',
        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
        'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
        'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
        '}'
      ].join('\n')
    }
  };

  var camera, scene, renderer, width, height;
  var mesh, atmosphere, point;

  var overRenderer;

  var curZoomSpeed = 0;
  var zoomSpeed = 50;

  var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
  var rotation = { x: 0, y: 0 },
      target = { x: Math.PI*3/2, y: Math.PI / 6.0 },
      targetOnDown = { x: 0, y: 0 };

  var distance = 100000, distanceTarget = 100000;
  var padding = 40;
  var PI_HALF = Math.PI / 2;

  function init() {

    container.style.color = '#fff';
    container.style.font = '13px/20px Arial, sans-serif';

    var shader, uniforms, material;
    width = container.offsetWidth || window.innerWidth;
    height = container.offsetHeight || window.innerHeight;

    camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000);
    camera.position.z = distance;

    scene = new THREE.Scene();

    var geometry = new THREE.SphereGeometry(200, 40, 30);

    //load earth
    shader = Shaders['earth'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    uniforms['texture'].value = THREE.ImageUtils.loadTexture('../images/world.jpg');

    material = new THREE.ShaderMaterial({

      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader

    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;
    scene.add(mesh);

    //load continents
    shader = Shaders['continents'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    material = new THREE.ShaderMaterial({

      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader

    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI;
    scene.add(loadTriMesh(getWorld, material));

    //load countries;
    scene.add(loadLineMesh(getCountry, new THREE.LineBasicMaterial({
      linewidth:2,
      color:0xffffff, opacity: 0.8
    })));

    //load atmosphere
    shader = Shaders['atmosphere'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    material = new THREE.ShaderMaterial({

      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true

    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set( 1.1, 1.1, 1.1 );
    scene.add(mesh);

    geometry = new THREE.CubeGeometry(0.75, 0.75, 1);
    geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,0,-0.5));

    point = new THREE.Mesh(geometry);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(width, height);

    renderer.domElement.style.position = 'absolute';

    container.appendChild(renderer.domElement);

    initializeCountryLabel();

    initializeLookupTexture();

    container.addEventListener('mousedown', onMouseDown, false);

    container.addEventListener('mousewheel', onMouseWheel, false);

    document.addEventListener('keydown', onDocumentKeyDown, false);

    window.addEventListener('resize', onWindowResize, false);

    container.addEventListener('mouseover', function() {
      overRenderer = true;
    }, false);

    container.addEventListener('mousemove',onMouseMove,false);

    container.addEventListener('mouseout', function() {
      overRenderer = false;
    }, false);

  }

  var countryLabel;
  var countryLabelText;
  function initializeCountryLabel(){
    countryLabel     = $("<div>", { id: "globe-country-label" });
    countryLabelText = $("<span>");
    countryLabel.append(countryLabelText);
    //countryLabel.append($("<small>Click to play</small>"));
    countryLabel.appendTo(container);
  }

  var lookupTexture;
  function initializeLookupTexture(){
    var width          = 2048;
    var height         = 1024;
    var fov            = 40;
    var aspect         = width / height;
    var dpr            = (window.devicePixelRatio) ? window.devicePixelRatio : 1;
    var cameraDistance = 900;
    var renderer       = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });

    renderer.setClearColor(0x222222);
    renderer.setSize(width/dpr, height/dpr);

    var scene  = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(fov, aspect, 1, 1000);

    camera.position.z = cameraDistance;

    var planeHeight = 2 * Math.tan((fov * Math.PI / 180) / 2) * cameraDistance;
    var planeWidth  = planeHeight * aspect;

    var texture = THREE.ImageUtils.loadTexture('../images/map_indexed.png', null, function() {
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;

      var planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
      var planeMaterial = new THREE.MeshBasicMaterial({map: texture});
      var plane         = new THREE.Mesh(planeGeometry, planeMaterial);

      scene.add(plane);

      renderer.render(scene, camera);
    });

    lookupTexture = {
      renderer: renderer,
      width: width,
      height: height
    };
  }

  function onMouseDown(event) {
    event.preventDefault();

    container.addEventListener('mousemove', onMouseMove, false);
    container.addEventListener('mouseup', onMouseUp, false);
    container.addEventListener('mouseout', onMouseOut, false);

    mouseOnDown.x = - event.clientX;
    mouseOnDown.y = event.clientY;

    targetOnDown.x = target.x;
    targetOnDown.y = target.y;

    container.style.cursor = 'move';
  }

  function onMouseMove(event) {
    mouse.x = - event.clientX;
    mouse.y = event.clientY;

    var zoomDamp = distance/1000;

    target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
    target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

    target.y = target.y > PI_HALF ? PI_HALF : target.y;
    target.y = target.y < - PI_HALF ? - PI_HALF : target.y;

    placeCountryLabel(event.clientX, event.clientY);
  }

  function placeCountryLabel(x,y){
    var country = countryFromScreenCoordinates(x, y);
    if (country) {
      if (!hoveredCountry || hoveredCountry.code != country.code) {
        hoveredCountry = country;
        countryLabelText.html(hoveredCountry.name);
        countryLabel.show();
      }
    } else {
      hoveredCountry = null;
      countryLabelText.html("");
      countryLabel.hide();
    }

    if (hoveredCountry) {
      countryLabel.css({'left': x + 30, 'top': y - 20});
    }
  }

  function onMouseUp(event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
    container.style.cursor = 'auto';
  }

  function onMouseOut(event) {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
  }

  function onMouseWheel(event) {
    event.preventDefault();
    if (overRenderer) {
      zoom(event.wheelDeltaY * 0.3);
    }
    return false;
  }

  function onDocumentKeyDown(event) {
    switch (event.keyCode) {
      case 38:
        zoom(100);
        event.preventDefault();
        break;
      case 40:
        zoom(-100);
        event.preventDefault();
        break;
    }
  }

  function onWindowResize( event ) {
    //console.log('resize');
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  };

  function zoom(delta) {
    distanceTarget -= delta;
    distanceTarget = distanceTarget > 1000 ? 1000 : distanceTarget;
    distanceTarget = distanceTarget < 350 ? 350 : distanceTarget;
  }

  function animate() {
    requestAnimationFrame(animate);
    render();
  }

  function render() {
    zoom(curZoomSpeed);

    rotation.x += (target.x - rotation.x) * 0.1;
    rotation.y += (target.y - rotation.y) * 0.1;
    distance += (distanceTarget - distance) * 0.3;

    camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
    camera.position.y = distance * Math.sin(rotation.y);
    camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

    camera.lookAt(mesh.position);

    renderer.render(scene, camera);
  }


  /* Coordinates Transform*/
  var countryFromScreenCoordinates = function(x, y) {
    var point = globeCoordinatesFromScreenCoordinates(x, y);
    if (point) {
      var uv          = textureCoordinatesFromGlobeCoordinates(point);
      var countryCode = countryCodeFromTextureCoordinates(uv);
      var locations = getLocation();
      var country     = locations(countryCode);
      return country;
    }
  }

  function globeCoordinatesFromScreenCoordinates(x,y) {
    var vector    = new THREE.Vector3((x / width) * 2 - 1, - (y / height) * 2 + 1, 0.5);
    var projector = new THREE.Projector();

    projector.unprojectVector(vector, camera);

    var raycaster  = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
    var intersects = raycaster.intersectObject(globe.children[0], true);

    if (intersects.length > 0) {
      return globe.worldToLocal(intersects[0].point);
    } else {
      return false;
    }
  }

  function textureCoordinatesFromGlobeCoordinates(x,y) {
    var normalizedPoint = new THREE.Vector3().copy(point).normalize();

    var normalizedU = 0.5 + (Math.atan2(normalizedPoint.x, normalizedPoint.z) / (2 * Math.PI));
    var normalizedV = 0.5 - (Math.asin(normalizedPoint.y) / Math.PI);

    var offsetU = (Math.round(lookupTexture.width * 906/4096));
    var offsetV = (Math.round(lookupTexture.height * 19/2048));

    return {
      u: (Math.round(normalizedU * lookupTexture.width) + offsetU) % lookupTexture.width,
      v: (Math.round(normalizedV * lookupTexture.height) - offsetV) % lookupTexture.height
    };
  }

  function  countryCodeFromTextureCoordinates(uv) {
    var gl    = lookupTexture.renderer.getContext();
    var top   = lookupTexture.height - uv.v;
    var left  = uv.u;
    var pixel = new Uint8Array(4);
    gl.readPixels(left, top, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return pixel[0];
  }
  //////////////////////////////////////////////////

  init();
  this.animate = animate;

  this.__defineGetter__('time', function() {
    return this._time || 0;
  });

  this.__defineSetter__('time', function(t) {
    var validMorphs = [];
    var morphDict = this.points.morphTargetDictionary;
    for(var k in morphDict) {
      if(k.indexOf('morphPadding') < 0) {
        validMorphs.push(morphDict[k]);
      }
    }
    validMorphs.sort();
    var l = validMorphs.length-1;
    var scaledt = t*l+1;
    var index = Math.floor(scaledt);
    for (i=0;i<validMorphs.length;i++) {
      this.points.morphTargetInfluences[validMorphs[i]] = 0;
    }
    var lastIndex = index - 1;
    var leftover = scaledt - index;
    if (lastIndex >= 0) {
      this.points.morphTargetInfluences[lastIndex] = 1 - leftover;
    }
    this.points.morphTargetInfluences[index] = leftover;
    this._time = t;
  });

  this.renderer = renderer;
  this.scene = scene;

  return this;

};

