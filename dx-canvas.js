//TODO:
// Add various object types:
// - Basic circle with fill and text and perhaps icon
// - Basic rectangle with fill and text and perhaps icon
// - Connector with start and end point. This one needs to update as a draggable object that it's connected to is dragged
// - Data List Object. Which is basically a rectangle with the option to expand to show its list contents
//      When it expands we need to adjust all objects to its left and bottom with the delta
//      This would be the base object for data model entities
// Find a way to build the input json from a logical flow of data (Virtual Routez)


const dx_canvas = {
    canvas_obj: null,
    context_obj: null,
    objects:{},
    active_object:null,
    is_mouse_down: false,
    drag_start:{x:0,y:0},
    drag_end:{x:0,y:0},
    drag_translate_factor:1,
    is_dragging:false,
    zoom_factor:0.02,
    initCanvas(element_id = "dxCanvas",objects = []) {
        this.canvas_obj = document.getElementById(element_id);
        this.setContext();
        this.canvas_obj.height = this.canvas_obj.parentElement.clientHeight;
        this.canvas_obj.width = this.canvas_obj.parentElement.clientWidth;
        this.canvas_obj.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        this.canvas_obj.addEventListener('mouseenter', this.onMouseEnter.bind(this), false);
        this.canvas_obj.addEventListener('mouseleave', this.onMouseLeave.bind(this), false);
        this.canvas_obj.addEventListener('mouseover', this.onMouseOver.bind(this), false);
        this.canvas_obj.addEventListener('mouseout', this.onMouseOut.bind(this), false);
        this.canvas_obj.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        this.canvas_obj.addEventListener('mouseup', this.onMouseUp.bind(this), false);
        this.canvas_obj.addEventListener('click', this.onMouseClick.bind(this), false);
        this.canvas_obj.addEventListener('dblclick', this.onMouseDoubleClick.bind(this), false);
        this.canvas_obj.addEventListener('contextmenu', this.onMouseRightClick.bind(this), false);
        this.canvas_obj.addEventListener('wheel', this.onMouseScroll.bind(this), false);
        /*this.registerObject(new DivbloxBaseCanvasObject({x:20,y:20},{is_draggable:true}));
        this.registerObject(new DivbloxBaseCanvasObject({x:140,y:40}));
        this.registerObject(new DivbloxBaseCanvasObject({x:200,y:400},
            {is_draggable:true,fill_colour:"#fe765d",
                dimensions: {width:100,height:200}}));*/
        for (const object of objects) {
            this.registerObject(this.initObjectFromJson(object));
        }
        window.requestAnimationFrame(this.update.bind(this));
    },
    initObjectFromJson(json_obj = {}) {
        if (typeof json_obj["type"] === "undefined") {
            throw new Error("No object type provided");
        }
        switch(json_obj["type"]) {
            case 'DivbloxBaseCanvasObject': return new DivbloxBaseCanvasObject({x:json_obj.x,y:json_obj.y},json_obj["additional_options"]);
            case 'DivbloxBaseHtmlCanvasObject': return new DivbloxBaseHtmlCanvasObject({x:json_obj.x,y:json_obj.y},json_obj["additional_options"]);
            case 'DivbloxBaseCircleCanvasObject': return new DivbloxBaseCircleCanvasObject({x:json_obj.x,y:json_obj.y},json_obj["additional_options"]);
                //TODO: When new object types are defined, implement their instantiation here.
            default: console.error("Invalid object type '"+json_obj["type"]+"' provided");
        }
    },
    setContext() {
        if (this.canvas_obj === null) {
            throw new Error("Canvas not initialized");
        }
        this.context_obj = this.canvas_obj.getContext('2d');
    },
    getContext() {
        this.setContext();
        return this.context_obj;
    },
    drawCanvas() {
        this.context_obj.save();
        this.context_obj.setTransform(1,0,0,1,0,0);
        this.context_obj.clearRect(0,0,this.canvas_obj.width,this.canvas_obj.height);
        this.context_obj.restore();
        for (const object_id of Object.keys(this.objects)) {
            const object = this.objects[object_id];
            object.drawObject(this.context_obj);
        }
    },
    resetCanvas() {
        this.context_obj.setTransform(1,0,0,1,0,0);
    },
    update() {
        this.drawCanvas();
        window.requestAnimationFrame(this.update.bind(this));
    },
    registerObject(object = null) {
        if (object === null) {
            return;
        }
        this.objects[object.getId()] = object;
    },
    validateEvent(event_obj = null) {
        this.setContext();
        if (event_obj === null) {
            throw new Error("Invalid event provided");
        }
    },
    getMousePosition(event_obj = null) {
        this.validateEvent(event_obj);
        const rect = this.canvas_obj.getBoundingClientRect();
        const transform = this.context_obj.getTransform();
        // This doesn't deal with skew
        const canvas_x = (event_obj.clientX - rect.left - transform.e) / transform.a;
        const canvas_y = (event_obj.clientY - rect.top - transform.f) / transform.d;
        return {
            x: event_obj.clientX - rect.left,
            y: event_obj.clientY - rect.top,
            cx:canvas_x,
            cy:canvas_y
        };
    },
    onMouseMove(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
        if (this.is_mouse_down) {
            this.drag_end.x = mouse.cx;
            this.drag_end.y = mouse.cy;
            this.updateDrag();
        }
    },
    onMouseEnter(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
    },
    onMouseLeave(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
    },
    onMouseOver(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
    },
    onMouseOut(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
    },
    onMouseDown(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
        this.is_mouse_down = true;
        this.drag_end = {x:0,y:0};
        this.drag_start.x = mouse.cx;
        this.drag_start.y = mouse.cy;
        this.setActiveObject({x:mouse.cx,y:mouse.cy});
    },
    onMouseUp(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
        this.is_mouse_down = false;
        if (!this.is_dragging) {
            // This was a click
            this.setActiveObject({x:mouse.cx,y:mouse.cy},true);
        } else {
            this.setActiveObject({x:-1,y:-1});
        }
        this.is_dragging = false;
    },
    onMouseClick(event_obj = null) {
        // We handle this with mouseup
    },
    onMouseDoubleClick(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
        if (this.active_object !== null) {
            this.active_object.onDoubleClick();
        }
    },
    onMouseRightClick(event_obj = null) {
        this.validateEvent(event_obj);
        event_obj.preventDefault();
        const mouse = this.getMousePosition(event_obj);
        console.log("Mouse right clicked at: "+JSON.stringify(mouse));
        this.resetCanvas();
    },
    onMouseScroll(event_obj = null) {
        this.validateEvent(event_obj);
        event_obj.preventDefault();
        const mouse = this.getMousePosition(event_obj);
        this.zoomCanvas(event_obj.deltaY/Math.abs(event_obj.deltaY));
    },
    setActiveObject(mouse_down_position = {x:0,y:0},trigger_click = false) {
        console.log("Objects: "+JSON.stringify(this.objects));
        if ((this.active_object !== null) && this.is_mouse_down) {
            // This means we are dragging and we don't want to change the active object
            console.log("Not setting active object");
            return;
        }
        this.active_object = null;
        for (const object_id of Object.keys(this.objects)) {
            const object = this.objects[object_id];
            if ((object.getBoundingRectangle().x1 <= mouse_down_position.x) &&
                (object.getBoundingRectangle().x2 >= mouse_down_position.x) &&
                (object.getBoundingRectangle().y1 <= mouse_down_position.y) &&
                (object.getBoundingRectangle().y2 >= mouse_down_position.y)) {
                this.active_object = object;
                if (trigger_click) {
                    this.active_object.onClick();
                }
                break;
            }
        }
        console.log("Active object: "+JSON.stringify(this.active_object));
    },
    updateDrag() {
        const tx = this.context_obj.getTransform();
        if (this.active_object === null) {
            const translate_x = this.drag_translate_factor*(this.drag_end.x - this.drag_start.x);
            const translate_y = this.drag_translate_factor*(this.drag_end.y - this.drag_start.y);
            this.context_obj.translate(translate_x,translate_y);
        } else {
            if (this.active_object.is_draggable) {
                if (!this.is_dragging) {
                    this.active_object.updateDeltas({x:this.drag_start.x,y:this.drag_start.y});
                }
                this.active_object.reposition({x:this.drag_end.x,y:this.drag_end.y});
                this.registerObject(this.active_object);
                console.log("Dragging object: "+JSON.stringify(this.active_object));
            }
        }
        this.is_dragging = true;
    },
    zoomCanvas(direction = -1) {
        let zoom_factor = 1-this.zoom_factor;
        if (direction < 0) {
            zoom_factor = 1+this.zoom_factor;
        }
        this.context_obj.scale(zoom_factor,zoom_factor);
    }
}
//#region Object types
class DivbloxBaseCanvasObject {
    constructor(draw_start_coords = {x:0,y:0},
                additional_options =
                    {is_draggable:false,
                        fill_colour:"#000000",
                        dimensions:
                            {width:100,height:100}
                    },
                object_data = {}) {
        this.id = Math.random().toString(20).substr(2, 6);
        this.x = draw_start_coords.x;
        this.y = draw_start_coords.y;
        this.x_delta = this.x;
        this.y_delta = this.y;
        this.width = 100;
        this.height = 100;
        this.additional_options = {};
        if (typeof additional_options !== "undefined") {
            this.additional_options = additional_options;
        }
        this.object_data = object_data;
        this.show_bounding_box = false; //Debug purposes
        this.initializeObject();
    }
    initializeObject() {
        if (typeof this.additional_options["dimensions"] !== "undefined") {
            if (this.additional_options["dimensions"]["width"] !== "undefined") {
                this.width = this.additional_options["dimensions"]["width"];
            }
            if (this.additional_options["dimensions"]["height"] !== "undefined") {
                this.height = this.additional_options["dimensions"]["height"];
            }
        }
        this.updateBoundingCoords();
        this.fill_colour = '#000000';
        if (typeof this.additional_options["fill_colour"] !== "undefined") {
            this.fill_colour = this.additional_options["fill_colour"];
        }
        this.is_draggable = false;
        if (typeof this.additional_options["is_draggable"] !== "undefined") {
            this.is_draggable = this.additional_options["is_draggable"];
        }
    }
    updateBoundingCoords() {
        this.bounding_rectangle_coords = {x1:this.x,y1:this.y,x2:this.x+this.width,y2:this.y+this.height};
    }
    getId() {
        return this.id;
    }
    getBoundingRectangle() {
        return this.bounding_rectangle_coords;
    }
    drawObject(context_obj = null) {
        //The base class simply draws a rectangle, but this function should be overridden for more complex shapes
        if (context_obj === null) {
            throw new Error("No context provided for object");
        }
        context_obj.save();
        this.drawShadow(context_obj);
        context_obj.fillStyle = this.fill_colour;
        context_obj.fillRect(this.x,this.y,this.width,this.height);
        context_obj.restore();

        //this.drawBoundingBox(context_obj); //Debug purposes
    }
    onClick() {
        console.log("Object "+this.getId()+" clicked");
    }
    onDoubleClick() {
        console.log("Object "+this.getId()+" double clicked");
    }
    updateDeltas(reference_coords = {x:0,y:0}) {
        this.x_delta = reference_coords.x - this.x;
        this.y_delta = reference_coords.y - this.y;
    }
    reposition(coords = {x:0,y:0}) {
        this.x = coords.x - this.x_delta;
        this.y = coords.y - this.y_delta;
        this.updateBoundingCoords();
    }
    getJson() {
        return {
            "type": "DivbloxBaseCanvasObject",
            "x": this.x,
            "y": this.y,
            "additional_options": this.additional_options,
            "data": this.object_data
        };
    }
    drawShadow(context_obj = null) {
        //The base class simply draws a rectangle, but this function should be overridden for more complex shapes
        if (context_obj === null) {
            throw new Error("No context provided for object");
        }
        context_obj.shadowColor = "#0000000f";
        context_obj.shadowBlur = 10;
        context_obj.shadowOffsetX = 0;
        context_obj.shadowOffsetY = 0;
    }
    drawBoundingBox(context_obj = null) {
        //The base class simply draws a rectangle, but this function should be overridden for more complex shapes
        if (context_obj === null) {
            throw new Error("No context provided for object");
        }

        context_obj.save();
        context_obj.lineWidth = 0.5;
        context_obj.beginPath();
        context_obj.moveTo(this.bounding_rectangle_coords.x1,this.bounding_rectangle_coords.y1);
        context_obj.lineTo(this.bounding_rectangle_coords.x2,this.bounding_rectangle_coords.y1);
        context_obj.lineTo(this.bounding_rectangle_coords.x2,this.bounding_rectangle_coords.y2);
        context_obj.lineTo(this.bounding_rectangle_coords.x1,this.bounding_rectangle_coords.y2);
        context_obj.lineTo(this.bounding_rectangle_coords.x1,this.bounding_rectangle_coords.y1);
        context_obj.fillStyle = "#000000";
        context_obj.closePath();
        context_obj.stroke();
        context_obj.restore();
    }
}
class DivbloxBaseHtmlCanvasObject extends DivbloxBaseCanvasObject {
    initializeObject() {
        super.initializeObject();
        if (typeof this.additional_options["html_to_render"] === "undefined") {
            throw new Error("No html provided");
        }
        const data = 'data:image/svg+xml;charset=utf-8,' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + this.width + '" height="' + this.height + '">' +
            '<foreignObject width="100%" height="100%">' +
            dx_helpers.htmlToXml(this.additional_options["html_to_render"]) +
            '</foreignObject>' +
            '</svg>';
        this.html_image = new Image();
        this.html_image.src = data;
        this.updateBoundingCoords();
    }
    drawObject(context_obj = null) {
        //The base class simply draws a rectangle, but this function should be overridden for more complex shapes
        if (context_obj === null) {
            throw new Error("No context provided for object");
        }
        context_obj.save();
        context_obj.drawImage(this.html_image,this.x,this.y);
        context_obj.restore();

        //this.drawBoundingBox(context_obj); //Debug purposes
    }
}
class DivbloxDataListCanvasObject extends DivbloxBaseCanvasObject {

}
/**
 * The DivbloxBaseCircleCanvasObject is basically a circle that is filled with a specified colour, has an optional image or text in
 * its center and also has an optional indicator on its top right
 *   _[x]
 * / x \
 * \__/
 *
 */
class DivbloxBaseCircleCanvasObject extends DivbloxBaseCanvasObject {
    initializeObject() {
        super.initializeObject();
        this.node_radius = 10;
        if (typeof this.additional_options["dimensions"] !== "undefined") {
            if (typeof this.additional_options["dimensions"]["radius"] !== "undefined") {
                this.node_radius = this.additional_options["dimensions"]["radius"];
            }
        }
        this.updateBoundingCoords();
    }
    updateBoundingCoords() {
        this.bounding_rectangle_coords =
            {x1:this.x-this.node_radius,
             y1:this.y-this.node_radius,
             x2:this.x+this.node_radius,
             y2:this.y+this.node_radius};
    }
    drawObject(context_obj = null) {
        if (context_obj === null) {
            throw new Error("No context provided for object");
        }
        context_obj.save();
        this.drawShadow(context_obj);
        context_obj.beginPath();
        context_obj.moveTo(this.x, this.y);
        context_obj.arc(this.x,this.y,this.node_radius,0,Math.PI * 2,true);
        context_obj.fillStyle = this.fill_colour;
        context_obj.fill();
        context_obj.restore();
        if (typeof this.additional_options["image"] !== "undefined") {
            const width = this.bounding_rectangle_coords.x2 - this.bounding_rectangle_coords.x1;
            const height = this.bounding_rectangle_coords.y2 - this.bounding_rectangle_coords.y1;
            const img_coords = {x:this.bounding_rectangle_coords.x1+width/4,y:this.bounding_rectangle_coords.y1+height/4}
            const img = new Image();
            img.src = this.additional_options["image"];
            context_obj.save();
            context_obj.drawImage(img,img_coords.x,img_coords.y,width/2,height/2);
            context_obj.restore();
        }


        //this.drawBoundingBox(context_obj);
    }
}
//#endregion
//#region Helper functions
const dx_helpers = {
    htmlToXml(html) {
        const doc = document.implementation.createHTMLDocument('');
        doc.write(html);
        // You must manually set the xmlns if you intend to immediately serialize
        // the HTML document to a string as opposed to appending it to a
        // <foreignObject> in the DOM
        doc.documentElement.setAttribute('xmlns', doc.documentElement.namespaceURI);
        // Get well-formed markup
        html = (new XMLSerializer).serializeToString(doc.body);
        return html;
    }
}
//#endregion
