//TODO:
// Add various object types:
// - Basic circle with fill and text and perhaps icon
// - Basic rectangle with fill and text and perhaps icon
// - Connector with start and end point. This one needs to update as a draggable object that it's connected to is dragged
// - Data List Object. Which is basically a rectangle with the option to expand to show its list contents
//      When it expands we need to adjust all objects to its left and bottom with the delta
//      This would be the base object for data model entities
// Find a way to build the input json from a logical flow of data

//#region The core DivbloxCanvas functionality
/**
 * DivbloxCanvas manages the drawing and updating of a canvas along with user inputs
 */
class DivbloxCanvas {
    /**
     * Sets up the canvas, based on the provided html element id and then initializes the relevant objects defined
     * in the objects array
     * @param element_id The id of the html element that describes the canvas
     * @param objects An array of objects to initialize on the canvas. See tests/test.json for an example
     */
    constructor(element_id = "dxCanvas",objects = []) {
        this.canvas_obj = document.getElementById(element_id);
        this.context_obj = null;
        this.objects = {};
        this.active_object = null;
        this.is_mouse_down = false;
        this.drag_start = {x:0,y:0};
        this.drag_end = {x:0,y:0};
        this.drag_translate_factor = 1;
        this.is_dragging = false;
        this.zoom_factor = 0.02;
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
        for (const object of objects) {
            this.registerObject(this.initObjectFromJson(object));
        }
        window.requestAnimationFrame(this.update.bind(this));
    }
    
    /**
     * Instantiates a new object to be rendered on the canvas, based on the json provided
     * @param json_obj The object to initialize
     * @param must_handle_error_bool If this is false, no error will be presented in the console if the object type
     * does not exist. This is useful for when you override this function in a child class to prevent unnecessary
     * console errors
     * @return {null} An instance of the newly instantiated object or null
     */
    initObjectFromJson(json_obj = {},must_handle_error_bool = true) {
        if (typeof json_obj["type"] === "undefined") {
            throw new Error("No object type provided");
        }
        let return_obj = null;
        switch(json_obj["type"]) {
            //TODO: When new object types are defined, implement their instantiation in a child class that overrides
            // this method. This child method should pass false to must_handle_error_bool and deal with it
            case 'DivbloxDataListCanvasObject':
            case 'DivbloxBaseCanvasObject': return_obj = new DivbloxBaseCanvasObject({x:json_obj.x,y:json_obj.y},json_obj["additional_options"]);
                break;
            case 'DivbloxBaseHtmlCanvasObject': return_obj = new DivbloxBaseHtmlCanvasObject({x:json_obj.x,y:json_obj.y},json_obj["additional_options"]);
                break;
            case 'DivbloxBaseCircleCanvasObject': return_obj = new DivbloxBaseCircleCanvasObject({x:json_obj.x,y:json_obj.y},json_obj["additional_options"]);
                break;
            default:
                if (must_handle_error_bool === true) {console.error("Invalid object type '"+json_obj["type"]+"' provided");}
        }
        return return_obj;
    }
    
    /**
     * A wrapper for the canvase getContext method that updates our local context object
     */
    setContext() {
        if ((this.canvas_obj === null) || (this.canvas_obj === undefined)) {
            throw new Error("Canvas not initialized");
        }
        this.context_obj = this.canvas_obj.getContext('2d');
    }
    
    /**
     * Refreshes the canvas context and returns it
     * @return {null}
     */
    getContext() {
        this.setContext();
        return this.context_obj;
    }
    
    /**
     * Cycles through the registered objects and draws them on the canvas
     */
    drawCanvas() {
        this.context_obj.save();
        this.context_obj.setTransform(1,0,0,1,0,0);
        this.context_obj.clearRect(0,0,this.canvas_obj.width,this.canvas_obj.height);
        this.context_obj.restore();
        for (const object_id of Object.keys(this.objects)) {
            const object = this.objects[object_id];
            object.drawObject(this.context_obj);
        }
    }
    
    /**
     * Resets all canvas transforms
     */
    resetCanvas() {
        this.context_obj.setTransform(1,0,0,1,0,0);
    }
    
    /**
     * This function is called recursively to update the canvas on every available animation frame
     */
    update() {
        this.drawCanvas();
        window.requestAnimationFrame(this.update.bind(this));
    }
    
    /**
     * Adds the relevant object to the objects array
     * @param object
     */
    registerObject(object = null) {
        if (object === null) {
            return;
        }
        this.objects[object.getId()] = object;
    }
    
    /**
     * Simply checks that a received event is not null. This throws an error when an expected event is null because
     * it would mean something went horribly wrong
     * @param event_obj The event object that was received
     */
    validateEvent(event_obj = null) {
        this.setContext();
        if (event_obj === null) {
            throw new Error("Invalid event provided");
        }
    }
    
    /**
     * Returns the position of the mouse on the canvas, honouring the transforms that were applied. This doesn't deal
     * with skew
     * @param event_obj The mouse event that was received
     * @return {{cx: number, cy: number, x: number, y: number}} cx & cy Are the mouse coordinates on the canvas
     */
    getMousePosition(event_obj = null) {
        this.validateEvent(event_obj);
        const rect = this.canvas_obj.getBoundingClientRect();
        const transform = this.context_obj.getTransform();
        const canvas_x = (event_obj.clientX - rect.left - transform.e) / transform.a;
        const canvas_y = (event_obj.clientY - rect.top - transform.f) / transform.d;
        return {
            x: event_obj.clientX - rect.left,
            y: event_obj.clientY - rect.top,
            cx:canvas_x,
            cy:canvas_y
        };
    }
    
    /**
     * Handles the mouse move event
     * @param event_obj The mouse event that was received
     */
    onMouseMove(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
        if (this.is_mouse_down) {
            this.drag_end.x = mouse.cx;
            this.drag_end.y = mouse.cy;
            this.updateDrag();
        }
    }
    
    /**
     * Handles the on mouse enter event
     * @param event_obj The mouse event that was received
     */
    onMouseEnter(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
    }
    
    /**
     * Handles the on mouse leave event
     * @param event_obj The mouse event that was received
     */
    onMouseLeave(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
    }
    
    /**
     * Handles the on mouse over event
     * @param event_obj The mouse event that was received
     */
    onMouseOver(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
    }
    
    /**
     * Handles the on mouse out event
     * @param event_obj The mouse event that was received
     */
    onMouseOut(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
    }
    
    /**
     * Handles the on mouse down event
     * @param event_obj The mouse event that was received
     */
    onMouseDown(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
        this.is_mouse_down = true;
        this.drag_end = {x:0,y:0};
        this.drag_start.x = mouse.cx;
        this.drag_start.y = mouse.cy;
        this.setActiveObject({x:mouse.cx,y:mouse.cy});
    }
    
    /**
     * Handles the on mouse up event
     * @param event_obj The mouse event that was received
     */
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
    }
    
    /**
     * Handles the on mouse click event
     * @param event_obj The mouse event that was received
     */
    onMouseClick(event_obj = null) {
        // We handle this with mouseup
    }
    
    /**
     * Handles the on mouse double click event
     * @param event_obj The mouse event that was received
     */
    onMouseDoubleClick(event_obj = null) {
        this.validateEvent(event_obj);
        const mouse = this.getMousePosition(event_obj);
        if (this.active_object !== null) {
            this.active_object.onDoubleClick();
        }
    }
    
    /**
     * Handles the on mouse right click event
     * @param event_obj The mouse event that was received
     */
    onMouseRightClick(event_obj = null) {
        this.validateEvent(event_obj);
        event_obj.preventDefault();
        const mouse = this.getMousePosition(event_obj);
        console.log("Mouse right clicked at: "+JSON.stringify(mouse));
        this.resetCanvas();
    }
    
    /**
     * Handles the on mouse scroll event
     * @param event_obj The mouse event that was received
     */
    onMouseScroll(event_obj = null) {
        this.validateEvent(event_obj);
        event_obj.preventDefault();
        const mouse = this.getMousePosition(event_obj);
        this.zoomCanvas(event_obj.deltaY/Math.abs(event_obj.deltaY));
    }
    
    /**
     * Uses the current mouse position to determine the object to set as active
     * @param mouse_down_position The position of the mouse where we want to check for an object
     * @param must_trigger_click_bool If true, then we trigger the onClick function of the relevant object
     */
    setActiveObject(mouse_down_position = {x:0,y:0},must_trigger_click_bool = false) {
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
                if (must_trigger_click_bool) {
                    this.active_object.onClick();
                }
                break;
            }
        }
    }
    
    /**
     * If an object is active, this method attempts to drag just that object on the canvas, otherwise it calculates
     * applies the correct transform while dragging the entire canvas
     */
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
            }
        }
        this.is_dragging = true;
    }
    
    /**
     * Zooms the canvas either in or out
     * @param direction If equal to 1, then it zooms out, otherwise it zooms in
     */
    zoomCanvas(direction = -1) {
        let zoom_factor = 1-this.zoom_factor;
        if (direction < 0) {
            zoom_factor = 1+this.zoom_factor;
        }
        this.context_obj.scale(zoom_factor,zoom_factor);
    }
}
//#endregion

//#region Object types
/**
 * The base canvas object class that provides for how an object is represented on the Divblox canvas. This class is
 * intended to be overridden by child classes to achieve different types of objects on the canvas without needing to
 * be concerned about how the object is positioned, etc.
 */
class DivbloxBaseCanvasObject {
    /**
     * Initializes the relevant data for the object
     * @param {{x: number, y: number}} draw_start_coords The x and y coordinates where this object is drawn from
     * @param additional_options Options specific to this object and how it is drawn and handled on the canvas
     * @param {boolean} additional_options.is_draggable If true, this object is draggable on the canvas
     * @param {string} additional_options.fill_colour A HEX value representing the fill colour for the object
     * @param {{width:number, height:number}} additional_options.dimensions {} An object containing the width and
     * height of this canvas object
     * @param object_data An object containing data relevant to the object. This data is not necessarily used on the
     * canvas, but is available to the developer when needed
     */
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
    
    /**
     * Initializes the relevant variables for this object
     */
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
    
    /**
     * Updates the bounding coordinates for the object. Useful when the canvas is transformed to ensure that the
     * object is displayed correctly
     */
    updateBoundingCoords() {
        this.bounding_rectangle_coords = {x1:this.x,y1:this.y,x2:this.x+this.width,y2:this.y+this.height};
    }
    
    /**
     * Returns the unique id associated with this object
     * @return {string}
     */
    getId() {
        return this.id;
    }
    
    /**
     * Returns the rectangle that covers the area of the obejct
     * @return {*|{y1: number, x1: number, y2: number, x2: number}}
     */
    getBoundingRectangle() {
        return this.bounding_rectangle_coords;
    }
    
    /**
     * This base class simply draws a rectangle, but this function should be overridden for more complex shapes
     * @param context_obj The context object of our canvas
     */
    drawObject(context_obj = null) {
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
    
    /**
     * This functions handles the on click event for this object. This should be implemented in a child class
     */
    onClick() {
        console.log("Object "+this.getId()+" clicked");
    }
    
    /**
     * This functions handles the on double click event for this object. This should be implemented in a child class
     */
    onDoubleClick() {
        console.log("Object "+this.getId()+" double clicked");
    }
    
    /**
     * Calculates x and y deltas based on the provided reference coordinates. Useful when dragging the object
     * @param {x:number, y:number} reference_coords The reference coordinates provided
     */
    updateDeltas(reference_coords = {x:0,y:0}) {
        this.x_delta = reference_coords.x - this.x;
        this.y_delta = reference_coords.y - this.y;
    }
    
    /**
     * Repositions the object to the coordinates provided
     * @param {x:number, y:number} coords The x and y coordinates to move to
     */
    reposition(coords = {x:0,y:0}) {
        this.x = coords.x - this.x_delta;
        this.y = coords.y - this.y_delta;
        this.updateBoundingCoords();
    }
    
    /**
     * Returns a JSON representation of this object
     * @return {{data: {}, x: number, y: number, additional_options: (*|{}|{is_draggable: boolean, fill_colour: string, dimensions: {width: number, height: number}}), type: string}}
     */
    getJson() {
        return {
            "type": "DivbloxBaseCanvasObject",
            "x": this.x,
            "y": this.y,
            "additional_options": this.additional_options,
            "data": this.object_data
        };
    }
    
    /**
     * Draws a shadow under the object
     * @param context_obj The context object of our canvas
     */
    drawShadow(context_obj = null) {
        if (context_obj === null) {
            throw new Error("No context provided for object");
        }
        context_obj.shadowColor = "#0000000f";
        context_obj.shadowBlur = 10;
        context_obj.shadowOffsetX = 0;
        context_obj.shadowOffsetY = 0;
    }
    
    /**
     * Draws the bounding box for this object. This function is used for debug purposes to see the area that an
     * object occupies
     * @param context_obj The context object of our canvas
     */
    drawBoundingBox(context_obj = null) {
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

/**
 * The DivbloxBaseHtmlCanvasObject attempts to render a piece of HTML on the canvas
 */
class DivbloxBaseHtmlCanvasObject extends DivbloxBaseCanvasObject {
    /**
     * Initializes the relevant variables for this object
     */
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
    /**
     * This base class draws the html provided onto the canvas
     * @param context_obj The context object of our canvas
     */
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

/**
 * The DivbloxDataListCanvasObject attempts to display an interactive HTML list, contained inside a <div> element as
 * an overlay on the canvas
 */
class DivbloxDataListCanvasObject extends DivbloxBaseCanvasObject {
    //TODO: Implement this class
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
    /**
     * Initializes the relevant data for the object
     * @param {{x: number, y: number}} draw_start_coords The x and y coordinates where this object is drawn from
     * @param additional_options Options specific to this object and how it is drawn and handled on the canvas
     * @param {boolean} additional_options.is_draggable If true, this object is draggable on the canvas
     * @param {string} additional_options.fill_colour A HEX value representing the fill colour for the object
     * @param {{radius:number}} additional_options.dimensions {} An object containing the radius of this canvas object
     * @param {string} additional_options.image {} Optional. The path to the image that should be displayed in the
     * center of the circle
     * @param {number} additional_options.notification_count {} Optional. A number to display in a notification
     * bubble at the top right of the circle
     * @param {string} additional_options.notification_bubble_colour A HEX value representing the fill colour for
     * the notification bubble
     * @param object_data An object containing data relevant to the object. This data is not necessarily used on the
     * canvas, but is available to the developer when needed
     */
    constructor(draw_start_coords = {x:0,y:0},
                additional_options= {
                    is_draggable:false,
                    fill_colour:"#000000",
                    dimensions:
                        {width:100,height:100}
                },
                object_data = {}) {
        super(draw_start_coords, additional_options, object_data);
    }
    
    /**
     * Initializes the relevant variables for this object
     */
    initializeObject() {
        this.notification_bubble_radius = 0;
        this.notification_bubble_colour = '#FF0000';
        super.initializeObject();
        this.radius = 10;
        this.notification_bubble_coords = {x:this.x,y:this.y};
        if (typeof this.additional_options["dimensions"] !== "undefined") {
            if (typeof this.additional_options["dimensions"]["radius"] !== "undefined") {
                this.radius = this.additional_options["dimensions"]["radius"];
                this.notification_bubble_radius = Math.round(this.radius * 0.25);
                this.notification_bubble_coords = {
                    x:this.x + (this.radius * Math.cos(315 * (Math.PI/180))),
                    y:this.y + (this.radius * Math.sin(315 * (Math.PI/180)))
                };
            }
        }
        if (typeof this.additional_options["notification_bubble_colour"] !== "undefined") {
            this.notification_bubble_colour = this.additional_options["notification_bubble_colour"];
        }
        this.updateBoundingCoords();
    }
    
    /**
     * Updates the bounding coordinates for the object based on the circle's radius
     */
    updateBoundingCoords() {
        this.bounding_rectangle_coords =
            {x1:this.x-this.radius,
             y1:this.y-this.radius,
             x2:this.x+this.radius,
             y2:this.y+this.radius};
    }
    
    /**
     * Draws the circle on the canvas
     * @param context_obj The context object of our canvas
     */
    drawObject(context_obj = null) {
        if (context_obj === null) {
            throw new Error("No context provided for object");
        }
        // Update the notification bubble's coordinates from the main object's
        this.notification_bubble_coords = {
            x:this.x + (this.radius * Math.cos(315 * (Math.PI/180))),
            y:this.y + (this.radius * Math.sin(315 * (Math.PI/180)))
        };
        // Start drawing the main object
        context_obj.save();
        
        this.drawShadow(context_obj);
        
        context_obj.beginPath();
        context_obj.moveTo(this.x, this.y);
        context_obj.arc(this.x,this.y,this.radius,0,Math.PI * 2,true);
        context_obj.fillStyle = this.fill_colour;
        context_obj.fill();
        context_obj.restore();
        
        // If we have notifications count higher than 0, let's draw the notification bubble
        if ((typeof this.additional_options["notification_count"] !== "undefined") && (this.additional_options["notification_count"] > 0)) {
            // Let's draw the notification counter and its containing bubble
            context_obj.save();
            
            const counter_text = this.additional_options["notification_count"];
            context_obj.font = "small-caps bold "+this.notification_bubble_radius+"px arial";
            
            const counter_text_width = Math.ceil(context_obj.measureText(counter_text).width) > (this.notification_bubble_radius) ?
                Math.floor(context_obj.measureText(counter_text).width - (this.notification_bubble_radius / 2)) : 0;
            
            const bubble_arc_coords = {
                x1:this.notification_bubble_coords.x,
                y1:this.notification_bubble_coords.y,
                x2:this.notification_bubble_coords.x + counter_text_width,
                y2:this.notification_bubble_coords.y};
            
            context_obj.fillStyle = this.notification_bubble_colour;
            
            context_obj.beginPath();
            context_obj.moveTo(bubble_arc_coords.x1, bubble_arc_coords.y1);
            context_obj.arc(bubble_arc_coords.x1, bubble_arc_coords.y1, this.notification_bubble_radius,270 * (Math.PI/180),90 * (Math.PI/180),true);
            context_obj.fill();
            context_obj.closePath();
            context_obj.beginPath();
            context_obj.moveTo(bubble_arc_coords.x2, bubble_arc_coords.y2);
            context_obj.arc(bubble_arc_coords.x2, bubble_arc_coords.y2, this.notification_bubble_radius,270 * (Math.PI/180),90 * (Math.PI/180),false);
            context_obj.fill();
            context_obj.closePath();
    
            context_obj.beginPath();
            context_obj.rect(bubble_arc_coords.x1 - 0.5, bubble_arc_coords.y1 - this.notification_bubble_radius, counter_text_width + 0.75, this.notification_bubble_radius * 2);
            context_obj.fill();
            
            let text_coords = {
                x:(bubble_arc_coords.x1 + bubble_arc_coords.x2) / 2,
                y:Math.ceil(this.notification_bubble_coords.y + (this.notification_bubble_radius / 4))}
            
            context_obj.fillStyle = '#fff';
            context_obj.textAlign = 'center';
            context_obj.fillText(counter_text, text_coords.x, text_coords.y);
            
            context_obj.restore();
        }
        
        // Let's add the provided image (if any) to the center of the circle
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
