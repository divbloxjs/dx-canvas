# dx-canvas
A canvas library used by various [Divblox](https://divblox.com) tools like the Divblox Data Modeler.

dx-canvas takes care of all the interactions with the canvas, namely:
1. Click handlers
2. Panning
3. Zooming
4. Dragging

Additionally, it is built using an object-oriented approach that allows for 
easily extending the existing functionality.

By default, dx-canvas provides a few base objects that can be displayed on 
the canvas, but these can easily be adapted for any purpose. It is also 
straight forward to add new object types for your specific requirements.

Install: 
````
 npm install --save https://github.com/divbloxjs/dx-canvas
````
Usage:
````
<div id="dxCanvasWrapper">
    <canvas id="dxCanvas">Please upgrade your browser to view this content</canvas>
</div>

<script src="node_modules/dx-canvas/dx-canvas.js"></script>

<script>
    // Get the path to the json file that contains our canvas model, assuming we are in the file index.html
    const script_start_index_int = window.location.href.indexOf("index.html");
    const root_str = window.location.href.substr(0,script_start_index_int);
    let dx_canvas = null;
    
    async function initCanvas() {
        // Load our canvas model (JSON), assuming it is located in the root and called test-model.json
        const response = await fetch(root_str+'test-model.json');
        const data_json = await response.json();
        
        // Instantiate the canvas using the model and specific options
        dx_canvas = new DivbloxCanvas('dxCanvas',data_json,{dx_canvas_root:"node_modules/dx-canvas/",background_color:"#E8F3EF",base_font_family:"Comic Sans MS"});
        
        // Example of how to download the canvas as an image
        const download_btn = document.getElementById('btnExportCanvas');
        download_btn.addEventListener('click', function () {
            dx_canvas.downloadCanvasPng();
        }, false);
    }
    initCanvas();
</script>
````

Additional examples of the following can be found in the /examples folder:
1. How to create your own custom implementation of dx-canvas
2. How the canvas model (JSON) should be formatted
3. How to include html content via an iframe onto your canvas
