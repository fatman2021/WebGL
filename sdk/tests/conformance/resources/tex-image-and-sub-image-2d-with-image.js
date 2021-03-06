/*
** Copyright (c) 2012 The Khronos Group Inc.
**
** Permission is hereby granted, free of charge, to any person obtaining a
** copy of this software and/or associated documentation files (the
** "Materials"), to deal in the Materials without restriction, including
** without limitation the rights to use, copy, modify, merge, publish,
** distribute, sublicense, and/or sell copies of the Materials, and to
** permit persons to whom the Materials are furnished to do so, subject to
** the following conditions:
**
** The above copyright notice and this permission notice shall be included
** in all copies or substantial portions of the Materials.
**
** THE MATERIALS ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
** EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
** MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
** IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
** CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
** TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
** MATERIALS OR THE USE OR OTHER DEALINGS IN THE MATERIALS.
*/

function generateTest(pixelFormat, pixelType, pathToTestRoot, prologue) {
    var wtu = WebGLTestUtils;
    var gl = null;
    var successfullyParsed = false;
    var imgCanvas;
    var red = [255, 0, 0];
    var green = [0, 255, 0];

    var init = function()
    {
        description('Verify texImage2D and texSubImage2D code paths taking image elements (' + pixelFormat + '/' + pixelType + ')');

        gl = wtu.create3DContext("example");

        if (!prologue(gl)) {
            finishTest();
            return;
        }

        gl.clearColor(0,0,0,1);
        gl.clearDepth(1);

        wtu.loadTexture(gl, pathToTestRoot + "/resources/red-green.png", runTest);
    }

    function runOneIteration(image, useTexSubImage2D, flipY, topColor, bottomColor,
                             bindingTarget, program)
    {
        debug('Testing ' + (useTexSubImage2D ? 'texSubImage2D' : 'texImage2D') +
              ' with flipY=' + flipY + ' bindingTarget=' +
              (bindingTarget == gl.TEXTURE_2D ? 'TEXTURE_2D' : 'TEXTURE_CUBE_MAP'));
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Disable any writes to the alpha channel
        gl.colorMask(1, 1, 1, 0);
        var texture = gl.createTexture();
        // Bind the texture to texture unit 0
        gl.bindTexture(bindingTarget, texture);
        // Set up texture parameters
        gl.texParameteri(bindingTarget, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(bindingTarget, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        // Set up pixel store parameters
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
        var targets = [gl.TEXTURE_2D];
        if (bindingTarget == gl.TEXTURE_CUBE_MAP) {
            targets = [gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                       gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                       gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                       gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                       gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                       gl.TEXTURE_CUBE_MAP_NEGATIVE_Z];
        }
        // Upload the image into the texture
        for (var tt = 0; tt < targets.length; ++tt) {
            if (useTexSubImage2D) {
                // Initialize the texture to black first
                gl.texImage2D(targets[tt], 0, gl[pixelFormat], image.width, image.height, 0,
                              gl[pixelFormat], gl[pixelType], null);
                gl.texSubImage2D(targets[tt], 0, 0, 0, gl[pixelFormat], gl[pixelType], image);
            } else {
                gl.texImage2D(targets[tt], 0, gl[pixelFormat], gl[pixelFormat], gl[pixelType], image);
            }
        }

        var loc;
        if (bindingTarget == gl.TEXTURE_CUBE_MAP) {
            loc = gl.getUniformLocation(program, "face");
        }

        for (var tt = 0; tt < targets.length; ++tt) {
            if (bindingTarget == gl.TEXTURE_CUBE_MAP) {
                gl.uniform1i(loc, targets[tt]);
            }

            // Draw the triangles
            wtu.clearAndDrawUnitQuad(gl, [0, 0, 0, 255]);
            // Check a few pixels near the top and bottom and make sure they have
            // the right color.
            debug("Checking lower left corner");
            wtu.checkCanvasRect(gl, 4, 4, 2, 2, bottomColor,
                                "shouldBe " + bottomColor);
            debug("Checking upper left corner");
            wtu.checkCanvasRect(gl, 4, gl.canvas.height - 8, 2, 2, topColor,
                                "shouldBe " + topColor);
        }
    }

    function runTestOnImage(image) {
        var cases = [
            { sub: false, flipY: true, topColor: red, bottomColor: green },
            { sub: false, flipY: false, topColor: green, bottomColor: red },
            { sub: true, flipY: true, topColor: red, bottomColor: green },
            { sub: true, flipY: false, topColor: green, bottomColor: red },
        ];

        var program = wtu.setupTexturedQuad(gl);
        for (var i in cases) {
            runOneIteration(image, cases[i].sub, cases[i].flipY,
                            cases[i].topColor, cases[i].bottomColor,
                            gl.TEXTURE_2D, program);
        }
        // cube map texture must be square.
        if (image.width != image.height)
            return;
        program = wtu.setupTexturedQuadWithCubeMap(gl);
        for (var i in cases) {
            runOneIteration(image, cases[i].sub, cases[i].flipY,
                            cases[i].topColor, cases[i].bottomColor,
                            gl.TEXTURE_CUBE_MAP, program);
        }
    }

    function runTest(image)
    {
        runTestOnImage(image);

        imgCanvas = document.createElement("canvas");
        imgCanvas.width = 2;
        imgCanvas.height = 2;
        var imgCtx = imgCanvas.getContext("2d");
        var imgData = imgCtx.createImageData(1, 2);
        for (var i = 0; i < 2; i++) {
            var stride = i * 8;
            imgData.data[stride + 0] = red[0];
            imgData.data[stride + 1] = red[1];
            imgData.data[stride + 2] = red[2];
            imgData.data[stride + 3] = 255;
            imgData.data[stride + 4] = green[0];
            imgData.data[stride + 5] = green[1];
            imgData.data[stride + 6] = green[2];
            imgData.data[stride + 7] = 255;
        }
        imgCtx.putImageData(imgData, 0, 0);

        // apparently Image is different than <img>.
        var newImage =  new Image();
        newImage.onload = function() {
            runTest2(newImage);
        };
        newImage.onerror = function() {
            testFailed("Creating image from canvas failed. Image src: " + this.src);
            finishTest();
        };
        newImage.src = imgCanvas.toDataURL();
    }

    function runTest2(image) {
        runTestOnImage(image);

        wtu.makeImageFromCanvas(imgCanvas, function() {
            runTest3(this);
        });
    }

    function runTest3(image) {
        runTestOnImage(image);

        wtu.glErrorShouldBe(gl, gl.NO_ERROR, "should be no errors");
        finishTest();
    }

    return init;
}
