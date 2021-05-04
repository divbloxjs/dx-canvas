/**
 * If set to true, more logging will happen and certain elements will be drawn on the screen to aid debugging
 * @type {boolean}
 */
const dx_canvas_debug_mode = true;

//#region The core DivbloxCanvas functionality
/**
 * DivbloxCanvas manages the drawing and updating of a canvas along with user inputs
 */
class DivbloxCanvas {
    /**
     * Sets up the canvas, based on the provided html element id and then initializes the relevant objects defined
     * in the objects array
     * @param element_id The id of the html element that describes the canvas
     * @param objects An array of objects to initialize on the canvas. See examples/test-model.json for an example
     * @param options Additional options to pass
     * @param {string} options.dx_canvas_root  The path to the root of dx-canvas.js. Needed to reference local
     * assets
     * @param {string} options.background_color A HEX value that represents the background color of the canvas
     * @param {string} options.base_font_family A string value that represents the base font of the canvas
     */
    constructor(element_id = "dxCanvas",objects = [],options = {}) {
        this.canvas_obj = document.getElementById(element_id);
        this.context_obj = null;
        this.objects = {};
        this.object_ordered_array = [];
        this.object_uid_map = {};
        this.active_object = null;
        this.is_mouse_down = false;
        this.drag_start = {x:0,y:0};
        this.drag_end = {x:0,y:0};
        this.drag_translate_factor = 1;
        this.is_dragging = false;
        this.zoom_factor = 0.02;
        this.zoom_current = 0;
        this.root_path = "/";

        if (typeof options["dx_canvas_root"] !== "undefined") {
            this.root_path = options["dx_canvas_root"];
        }
        this.background_color = "#fff";
        if (typeof options["background_color"] !== "undefined") {
            this.background_color = options["background_color"];
        }
        this.base_font_family = "arial";
        if (typeof options["base_font_family"] !== "undefined") {
            this.base_font_family = options["base_font_family"].toLowerCase();
        }

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
        const canvas_id = Object.keys(this.objects).length;
        switch(json_obj["type"]) {
            //TODO: When new object types are defined, implement their instantiation in a child class that overrides
            // this method. This child method should pass false to must_handle_error_bool and deal with it
            case 'DivbloxBaseCanvasObject': return_obj = new DivbloxBaseCanvasObject(this,{x:json_obj.x,y:json_obj.y},json_obj["additional_options"],json_obj["data"],canvas_id);
                break;
            case 'DivbloxBaseCircleCanvasObject': return_obj = new DivbloxBaseCircleCanvasObject(this,{x:json_obj.x,y:json_obj.y},json_obj["additional_options"],json_obj["data"],canvas_id);
                break;
            case 'DivbloxBaseRectangleCanvasObject': return_obj = new DivbloxBaseRectangleCanvasObject(this,{x:json_obj.x,y:json_obj.y},json_obj["additional_options"],json_obj["data"],canvas_id);
                break;
            case 'DivbloxBaseHtmlCanvasObject':return_obj = new DivbloxBaseHtmlCanvasObject(this,{x:json_obj.x,y:json_obj.y},json_obj["additional_options"],json_obj["data"],canvas_id);
                break;
            default:
                if (must_handle_error_bool === true) {console.error("Invalid object type '"+json_obj["type"]+"' provided");}
        }
        return return_obj;
    }
    
    /**
     * Returns an instance of an implementation of DivbloxBaseCanvasObject for the given canvas id
     * @param canvas_id The canvas id to search on
     * @return {null|*}
     */
    getObjectByCanvasId(canvas_id = -1) {
        if (typeof this.objects[canvas_id] === "undefined") {return null;}
        return this.objects[canvas_id];
    }
    
    /**
     * Returns an instance of an implementation of DivbloxBaseCanvasObject for the given unique id
     * @param uid The unique id to search on
     * @return {null|*}
     */
    getObjectByUid(uid = -1) {
        if (typeof this.object_uid_map[uid] === "undefined") {return null;}
        return this.getObjectByCanvasId(this.object_uid_map[uid]);
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
     * Returns the path to the root of dx-canvas.js.
     * @return {string} The path as a string
     */
    getDxCanvasRoot() {
        return this.root_path;
    }
    
    /**
     * Cycles through the registered objects and draws them on the canvas
     */
    drawCanvas() {
        const rect = this.canvas_obj.getBoundingClientRect();

        this.context_obj.save();
        this.context_obj.setTransform(1,0,0,1,0,0);
        this.context_obj.clearRect(0,0,this.canvas_obj.width,this.canvas_obj.height);
        this.context_obj.restore();
       
        this.context_obj.save();

        const transform = this.context_obj.getTransform();
        const rect_transformed =  {
            left:(-transform.e) / transform.a,
            top:(-transform.f) / transform.d,
            right:(this.canvas_obj.width - transform.e) / transform.a,
            bottom:(this.canvas_obj.height - transform.f) / transform.d,
        };
        this.context_obj.beginPath();
        this.context_obj.moveTo(rect_transformed.left,rect_transformed.top);
        this.context_obj.lineTo(rect_transformed.right,rect_transformed.top);
        this.context_obj.lineTo(rect_transformed.right,rect_transformed.bottom);
        this.context_obj.lineTo(rect_transformed.left,rect_transformed.bottom);
        this.context_obj.lineTo(rect_transformed.left,rect_transformed.top);
        this.context_obj.fillStyle = this.background_color;
        this.context_obj.fill();
        this.context_obj.closePath();
        this.context_obj.restore();
        
        for (const object_id of this.object_ordered_array) {
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
        this.object_uid_map[object.getUid()] = object.getId();
        const active_obj_index = this.object_ordered_array.indexOf(object.getId().toString());
        if (active_obj_index === -1) {
            this.object_ordered_array.push(object.getId().toString());
        }
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
        this.active_object = null;
        const reversed_order_array = [...this.object_ordered_array].reverse();
        for (const object_id of reversed_order_array) {
            const object = this.objects[object_id];
            if ((object.getBoundingRectangle().x1 <= mouse_down_position.x) &&
                (object.getBoundingRectangle().x2 >= mouse_down_position.x) &&
                (object.getBoundingRectangle().y1 <= mouse_down_position.y) &&
                (object.getBoundingRectangle().y2 >= mouse_down_position.y)) {
                this.active_object = object;
                if (must_trigger_click_bool) {
                    this.active_object.onClick();
                }
                const active_obj_index = this.object_ordered_array.indexOf(object_id.toString());
                if (active_obj_index !== (this.object_ordered_array.length - 1)) {
                    this.object_ordered_array.splice(active_obj_index, 1);
                    this.object_ordered_array.push(object_id.toString().toString());
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
            this.zoom_current += this.zoom_factor;
        } else {
            this.zoom_current -= this.zoom_factor;
        }
        this.context_obj.scale(zoom_factor,zoom_factor);
    }

    /**
     * Returns a JSON representation of the current canvas that can be used to reload it later
     * @returns {*[]}
     */
    getCanvasJson() {
        let export_json = [];
        for (const object_id of Object.keys(this.objects)) {
            const object = this.objects[object_id];
            export_json.push(object.getJson());
        }
        return export_json;
    }

    /**
     * Initiates an image download in the browser with the provided file name
     */
    downloadCanvasPng(file_name = 'exported_image.png') {
        const link_source = this.canvas_obj.toDataURL('image/png');
        const download_link = document.createElement("a");
        download_link.href = link_source;
        download_link.download = file_name;
        download_link.click();
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
     * @param {*} dx_canvas_obj The instance of the DivbloxCanvas object that controls the canvas
     * @param {{x: number, y: number}} draw_start_coords The x and y coordinates where this object is drawn from
     * @param additional_options Options specific to this object and how it is drawn and handled on the canvas
     * @param {string} additional_options.uid An optional, user-specified unique identifier for this object. Used to
     * link objects to each other
     * @param {boolean} additional_options.is_draggable If true, this object is draggable on the canvas
     * @param {string} additional_options.fill_colour A HEX value representing the fill colour for the object
     * @param {{width:number, height:number}} additional_options.dimensions {} An object containing the width and
     * height of this canvas object
     * @param object_data Optional. An object containing data relevant to the object. This data is not necessarily used
     * on the canvas, but is available to the developer when needed
     * @param {number} canvas_id Optional. The id that will be used to detect this object on the canvas
     */
    constructor(dx_canvas_obj = null,
                draw_start_coords = {x:0,y:0},
                additional_options =
                    {is_draggable:false,
                        fill_colour:"#000000",
                        dimensions:
                            {width:100,height:100}
                    },
                object_data = {},
                canvas_id = -1) {
        if (dx_canvas_obj === null) {throw new Error("DivbloxCanvas not provided to DivbloxBaseCanvasObject")}
        this.dx_canvas_obj = dx_canvas_obj;
        if (canvas_id === -1) {
            this.canvas_id = Math.random().toString(20).substr(2, 6);
        } else {
            this.canvas_id = canvas_id;
        }
        this.uid = this.canvas_id;
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
        if (typeof this.additional_options["uid"] !== "undefined") {
            this.uid = this.additional_options["uid"];
        }
        this.object_data = object_data;
        this.show_bounding_box = false; //Debug purposes
        this.notification_bubble_radius = 0;
        this.notification_bubble_colour = '#FF0000';
        this.notification_bubble_coords = {x:this.x, y:this.y};
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
        this.updateNotificationBubbleProperties();
    }
    
    /**
     * Updates the properties of the notification bubble that could be displayed at the top right of the object
     */
    updateNotificationBubbleProperties() {
        if (typeof this.additional_options["notification_bubble_colour"] !== "undefined") {
            this.notification_bubble_colour = this.additional_options["notification_bubble_colour"];
        }
        this.notification_bubble_radius = Math.round(this.height * 0.25);
        this.notification_bubble_coords = {
            x:this.x + this.width,
            y:this.y
        };
    }
    
    /**
     * Updates the bounding coordinates for the object. Useful when the canvas is transformed to ensure that the
     * object is displayed correctly
     */
    updateBoundingCoords() {
        this.bounding_rectangle_coords = {x1:this.x,y1:this.y,x2:this.x+this.width,y2:this.y+this.height};
    }
    
    /**
     * Returns the canvas id associated with this object
     * @return {string}
     */
    getId() {
        return this.canvas_id;
    }
    
    /**
     * Returns the user-specified unique id associated with this object
     * @return {string}
     */
    getUid() {
        return this.uid;
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
        this.updateNotificationBubbleProperties();
        this.drawObjectComponents(context_obj);
        this.drawNotificationBubble(context_obj);
        this.drawObjectConnections(context_obj);
        if (this.show_bounding_box) {
            this.drawBoundingBox(context_obj); //Debug purposes
        }
    }
    
    /**
     * Draws the canvas components that make up this object
     * @param context_obj The context object of our canvas
     */
    drawObjectComponents(context_obj = null) {
        context_obj.save();
        this.drawShadow(context_obj);
        context_obj.fillStyle = this.fill_colour;
        context_obj.fillRect(this.x,this.y,this.width,this.height);
        context_obj.restore();
    }
    
    /**
     * Draws the connectors from this object to its specified connections
     * @param context_obj The context object of our canvas
     */
    drawObjectConnections(context_obj = null) {
        if ((typeof this.additional_options["connections"] === "undefined") || (this.additional_options["connections"].length === 0)) {
            return;
        }
        const arrow_head_length = 25;
        for (const connection_uid of this.additional_options["connections"]) {
            const connected_obj = this.dx_canvas_obj.getObjectByUid(connection_uid);
            if (connected_obj === null) {
                continue;
            }
            const connected_obj_bounding_rectangle = connected_obj.getBoundingRectangle();
            let connector_coords = {
                x1:this.bounding_rectangle_coords.x1 + ((this.bounding_rectangle_coords.x2 - this.bounding_rectangle_coords.x1) / 2),
                y1:this.bounding_rectangle_coords.y1 + ((this.bounding_rectangle_coords.y2 - this.bounding_rectangle_coords.y1) / 2),
                x2:connected_obj_bounding_rectangle.x1 + ((connected_obj_bounding_rectangle.x2 - connected_obj_bounding_rectangle.x1) / 2),
                y2:connected_obj_bounding_rectangle.y1 + ((connected_obj_bounding_rectangle.y2 - connected_obj_bounding_rectangle.y1) / 2),
                arrow_x:0,
                arrow_y:0};
            
            if (connected_obj_bounding_rectangle.y1 > this.bounding_rectangle_coords.y2) {
                // This means the connected object is below the current object
                connector_coords.y1 = this.bounding_rectangle_coords.y2;
                connector_coords.y2 = connected_obj_bounding_rectangle.y1;
            } else if (connected_obj_bounding_rectangle.y2 < this.bounding_rectangle_coords.y1) {
                connector_coords.y1 = this.bounding_rectangle_coords.y1;
                connector_coords.y2 = connected_obj_bounding_rectangle.y2;
            } else {
                // Deal with left or right side, since this connects is level with the current object
                if (connected_obj_bounding_rectangle.x1 > this.bounding_rectangle_coords.x2) {
                    connector_coords.x1 = this.bounding_rectangle_coords.x2;
                    connector_coords.x2 = connected_obj_bounding_rectangle.x1;
                } else if (connected_obj_bounding_rectangle.x2 < this.bounding_rectangle_coords.x1) {
                    connector_coords.x1 = this.bounding_rectangle_coords.x1;
                    connector_coords.x2 = connected_obj_bounding_rectangle.x2;
                }
            }
            context_obj.save();
            context_obj.lineWidth = 1;
            context_obj.beginPath();
            context_obj.moveTo(connector_coords.x1, connector_coords.y1);
            context_obj.quadraticCurveTo(
                1.02*(connector_coords.x1 + ((connector_coords.x2 - connector_coords.x1) / 2)),
                1.02*(connector_coords.y1 + ((connector_coords.y2 - connector_coords.y1) / 2)),
                connector_coords.x2,
                connector_coords.y2);
            context_obj.stroke();
            context_obj.closePath();
            context_obj.restore();
            
            let arrow_angle = Math.atan((connector_coords.y2 - connector_coords.y1) / (connector_coords.x2 - connector_coords.x1));
            arrow_angle += ((connector_coords.x2 > connector_coords.x1) ? 90 : -90) * Math.PI/180;
            dx_helpers.drawArrowhead(context_obj, connector_coords.x2, connector_coords.y2, arrow_angle, arrow_head_length);
        }
    }
    
    /**
     * Draws the notification bubble at the top right of the object if it is required
     * @param context_obj The context object of our canvas
     */
    drawNotificationBubble(context_obj = null) {
        if (context_obj === null) {
            throw new Error("No context provided for object");
        }
        // If we have notifications count higher than 0, let's draw the notification bubble
        if ((typeof this.additional_options["notification_count"] !== "undefined") && (this.additional_options["notification_count"] > 0)) {
            // Let's draw the notification counter and its containing bubble
            context_obj.save();
            
            const counter_text = this.additional_options["notification_count"];
            context_obj.font = "small-caps bold "+this.notification_bubble_radius+"px "+this.dx_canvas_obj.base_font_family;
            
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
            "type": this.constructor.name,
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
        context_obj.shadowColor = "#0000001F";
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
    
    /**
     * Returns the actual screen coordinates for this object
     * @param context_obj The context object of our canvas
     * @return {{y1: number, x1: number, y2: number, x2: number}}
     */
    getScreenCoordinates(context_obj = null) {
        const rect = this.dx_canvas_obj.canvas_obj.getBoundingClientRect();
        const transform = context_obj.getTransform();
        return {
            x1:transform.a*(this.bounding_rectangle_coords.x1 + rect.left + transform.e),
            y1:transform.d*(this.bounding_rectangle_coords.y1 + rect.top + transform.f),
            x2:transform.a*(this.bounding_rectangle_coords.x2 + rect.left + transform.e),
            y2:transform.d*(this.bounding_rectangle_coords.y2 + rect.top + transform.f),
        };
    }
}

/**
 * The DivbloxBaseCircleCanvasObject is basically a circle that is filled with a specified colour, has an optional image
 * in its center and also has an optional notification indicator at its top right
 *   _[x]
 * / x \
 * \__/
 *
 */
class DivbloxBaseCircleCanvasObject extends DivbloxBaseCanvasObject {
    /**
     * Initializes the relevant data for the object
     * @param {*} dx_canvas_obj The instance of the DivbloxCanvas object that controls the canvas
     * @param {{x: number, y: number}} draw_start_coords The x and y coordinates where this object is drawn from
     * @param additional_options Options specific to this object and how it is drawn and handled on the canvas
     * @param {string} additional_options.uid An optional, user-specified unique identifier for this object. Used to
     * link objects to each other
     * @param {boolean} additional_options.is_draggable If true, this object is draggable on the canvas
     * @param {string} additional_options.fill_colour A HEX value representing the fill colour for the object
     * @param {{radius:number}} additional_options.dimensions {} An object containing the radius of this canvas object
     * @param {string} additional_options.image {} Optional. The path to the image that should be displayed in the
     * center of the circle
     * @param {number} additional_options.notification_count {} Optional. A number to display in a notification
     * bubble at the top right of the circle
     * @param {string} additional_options.notification_bubble_colour A HEX value representing the fill colour for
     * the notification bubble
     * @param object_data Optional. An object containing data relevant to the object. This data is not necessarily used
     * on the canvas, but is available to the developer when needed
     * @param {number} canvas_id Optional. The id that will be used to detect this object on the canvas
     */
    constructor(dx_canvas_obj = null,
                draw_start_coords = {x:0,y:0},
                additional_options= {
                    is_draggable:false,
                    fill_colour:"#000000",
                    dimensions:
                        {radius:15}
                },
                object_data = {},
                canvas_id = -1) {
        super(dx_canvas_obj,draw_start_coords, additional_options, object_data, canvas_id);
    }
    
    /**
     * Initializes the relevant variables for this object
     */
    initializeObject() {
        this.image_obj = null;
        this.radius = 10;
        if (typeof this.additional_options["dimensions"] !== "undefined") {
            if (typeof this.additional_options["dimensions"]["radius"] !== "undefined") {
                this.radius = this.additional_options["dimensions"]["radius"];
            }
        }
        super.initializeObject();
    }
    
    /**
     * Updates the properties of the notification bubble that could be displayed at the top right of the object
     */
    updateNotificationBubbleProperties() {
        if (typeof this.additional_options["notification_bubble_colour"] !== "undefined") {
            this.notification_bubble_colour = this.additional_options["notification_bubble_colour"];
        }
        this.notification_bubble_radius = Math.round(this.radius * 0.25);
        this.notification_bubble_coords = {
            x:this.x + (this.radius * Math.cos(315 * (Math.PI/180))),
            y:this.y + (this.radius * Math.sin(315 * (Math.PI/180)))
        };
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
    drawObjectComponents(context_obj = null) {
        if (context_obj === null) {
            throw new Error("No context provided for object");
        }
        // Start drawing the main object
        context_obj.save();
        this.drawShadow(context_obj);
        context_obj.beginPath();
        context_obj.moveTo(this.x, this.y);
        context_obj.arc(this.x,this.y,this.radius,0,Math.PI * 2,true);
        context_obj.fillStyle = this.fill_colour;
        context_obj.fill();
        context_obj.restore();
        
        // Let's add the provided image (if any) to the center of the circle
        if (typeof this.additional_options["image"] !== "undefined") {
            const width = this.bounding_rectangle_coords.x2 - this.bounding_rectangle_coords.x1;
            const height = this.bounding_rectangle_coords.y2 - this.bounding_rectangle_coords.y1;
            const img_coords = {x:this.bounding_rectangle_coords.x1+width/4,y:this.bounding_rectangle_coords.y1+height/4}
            if (this.image_obj === null) {
                this.image_obj = new Image();
                if (this.additional_options["image"].indexOf("http") !== -1) {
                    this.image_obj.src = this.additional_options["image"];
                } else {
                    this.image_obj.src = this.dx_canvas_obj.getDxCanvasRoot()+this.additional_options["image"];
                    this.image_obj.setAttribute('crossorigin', 'anonymous');
                }
            } else {
                context_obj.save();
                context_obj.drawImage(this.image_obj,img_coords.x,img_coords.y,width/2,height/2);
                context_obj.restore();
            }
        }
    }
}

/**
 * The DivbloxBaseRectangleCanvasObject is basically a rectangle that is filled with a specified colour, has an optional
 * image or text in its center and also has an optional notification indicator at its top right
 *  ________[x]
 * | abcdef |
 * ---------
 */
class DivbloxBaseRectangleCanvasObject extends DivbloxBaseCanvasObject {
    /**
     * Initializes the relevant data for the object
     * @param {*} dx_canvas_obj The instance of the DivbloxCanvas object that controls the canvas
     * @param {{x: number, y: number}} draw_start_coords The x and y coordinates where this object is drawn from
     * @param additional_options Options specific to this object and how it is drawn and handled on the canvas
     * @param {string} additional_options.uid An optional, user-specified unique identifier for this object. Used to
     * link objects to each other
     * @param {boolean} additional_options.is_draggable If true, this object is draggable on the canvas
     * @param {string} additional_options.fill_colour A HEX value representing the fill colour for the object
     * @param {{width:number,height:number}} additional_options.dimensions {} An object containing the dimensions of
     * this canvas object
     * @param {string} additional_options.text {} Optional. The text that should be displayed in the
     * center of the rectangle
     * @param {string} additional_options.text_colour {} Optional. A HEX value representing the colour of the text
     * to display
     * @param {string} additional_options.image {} Optional. The path to the image that should be displayed in the
     * center of the rectangle
     * @param {number} additional_options.notification_count {} Optional. A number to display in a notification
     * bubble at the top right of the rectangle
     * @param {string} additional_options.notification_bubble_colour A HEX value representing the fill colour for
     * the notification bubble
     * @param object_data Optional. An object containing data relevant to the object. This data is not necessarily used
     * on the canvas, but is available to the developer when needed
     * @param {number} canvas_id Optional. The id that will be used to detect this object on the canvas
     */
    constructor(dx_canvas_obj = null,
                draw_start_coords = {x:0,y:0},
                additional_options= {
                    is_draggable:false,
                    fill_colour:"#000000",
                    dimensions:
                        {width:100,height:100}
                },
                object_data = {},
                canvas_id = -1) {
        super(dx_canvas_obj,draw_start_coords, additional_options, object_data, canvas_id);
        this.corner_radius = {top_left: 10, top_right: 10, bottom_right: 10, bottom_left: 10};
        this.corner_radius = {top_left: 10, top_right: 10, bottom_right: 10, bottom_left: 10};
        // These values are percentages of the smallest side of the rectangle
    }

    /**
     * Initializes the relevant variables for this object
     */
    initializeObject() {
        this.image_obj = null;
        super.initializeObject();
    }

    /**
     * Draws the rectangle on the canvas
     * @param context_obj The context object of our canvas
     */
    drawObjectComponents(context_obj = null) {
        if (context_obj === null) {
            throw new Error("No context provided for object");
        }
        
        // Start drawing the main object
        context_obj.save();
        this.drawShadow(context_obj);
        const border_radius_delta = this.width > this.height ? this.height : this.width;
        const relative_radius = {
            top_left:border_radius_delta * (this.corner_radius.top_left / 100),
            top_right:border_radius_delta * (this.corner_radius.top_right / 100),
            bottom_right:border_radius_delta * (this.corner_radius.bottom_right / 100),
            bottom_left:border_radius_delta * (this.corner_radius.bottom_left / 100)
        }
        context_obj.beginPath();
        context_obj.moveTo(this.x + relative_radius.top_left, this.y);
        context_obj.lineTo(this.x + this.width - relative_radius.top_right, this.y);
        context_obj.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + relative_radius.top_right);
        context_obj.lineTo(this.x + this.width, this.y + this.height - relative_radius.bottom_right);
        context_obj.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - relative_radius.bottom_right, this.y + this.height);
        context_obj.lineTo(this.x + relative_radius.bottom_left, this.y + this.height);
        context_obj.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - relative_radius.bottom_left);
        context_obj.lineTo(this.x, this.y + relative_radius.top_left);
        context_obj.quadraticCurveTo(this.x, this.y, this.x + relative_radius.top_left, this.y);
        context_obj.fillStyle = this.fill_colour;
        context_obj.fill();
        context_obj.closePath();
        context_obj.restore();
        
        // Let's add the provided image (if any) to the center of the rectangle
        if (typeof this.additional_options["image"] !== "undefined") {
            const img_coords = {x:this.bounding_rectangle_coords.x1+this.width/4,y:this.bounding_rectangle_coords.y1+this.height/4}
            if (this.image_obj === null) {
                this.image_obj = new Image();
                if (this.additional_options["image"].indexOf("http") !== -1) {
                    this.image_obj.src = this.additional_options["image"];
                } else {
                    this.image_obj.src = this.dx_canvas_obj.getDxCanvasRoot()+this.additional_options["image"];
                    this.image_obj.setAttribute('crossorigin', 'anonymous');
                }
            } else {
                context_obj.save();
                context_obj.drawImage(this.image_obj,img_coords.x,img_coords.y,this.width/2,this.height/2);
                context_obj.restore();
            }
        }
        
        // Let's add the provided text (if any) to the center of the rectangle
        if (typeof this.additional_options["text"] !== "undefined") {
            const max_font_size = this.height / 4;
            let font_size = max_font_size;
            context_obj.font = "small-caps bold "+font_size+"px "+this.dx_canvas_obj.base_font_family;
            let text_width = Math.ceil(context_obj.measureText(this.additional_options["text"]).width);
            while (text_width > (this.width * 0.8)) {
                font_size = font_size - 0.5;
                context_obj.font = "small-caps bold "+font_size+"px "+this.dx_canvas_obj.base_font_family;
                text_width = Math.ceil(context_obj.measureText(this.additional_options["text"]).width);
            }
            const text_coords = {x:this.x + (this.width / 2),y: this.y + (this.height / 2) + (font_size / 4)};
            context_obj.save();
            context_obj.fillStyle = '#000';
            if (typeof this.additional_options["text_colour"] !== "undefined") {
                context_obj.fillStyle = this.additional_options["text_colour"];
            }
            context_obj.textAlign = 'center';
            context_obj.fillText(this.additional_options["text"],text_coords.x,text_coords.y);
            context_obj.restore();
        }
    }
}

/**
 * The DivbloxBaseHtmlCanvasObject attempts to display an interactive HTML section, contained inside a <div> element as
 * an overlay on the canvas
 */
class DivbloxBaseHtmlCanvasObject extends DivbloxBaseCanvasObject {
    /**
     * Initializes the relevant data for the object
     * @param {*} dx_canvas_obj The instance of the DivbloxCanvas object that controls the canvas
     * @param {{x: number, y: number}} draw_start_coords The x and y coordinates where this object is drawn from
     * @param additional_options Options specific to this object and how it is drawn and handled on the canvas
     * @param {string} additional_options.uid An optional, user-specified unique identifier for this object. Used to
     * link objects to each other
     * @param {boolean} additional_options.is_draggable If true, this object is draggable on the canvas
     * @param {string} additional_options.fill_colour A HEX value representing the fill colour for the object
     * @param {{width:number,height:number}} additional_options.dimensions {} An object containing the dimensions of
     * this canvas object
     * @param {{width:number,height:number}} additional_options.dimensions.expanded_dimensions {} An object
     * containing the dimensions of the object when it is expanded
     * @param {string} additional_options.text {} Optional. The text that should be displayed in the
     * center of the rectangle
     * @param {string} additional_options.text_colour {} Optional. A HEX value representing the colour of the text
     * to display
     * @param {string} additional_options.image {} Optional. The path to the image that should be displayed in the
     * center of the rectangle
     * @param {number} additional_options.notification_count {} Optional. A number to display in a notification
     * bubble at the top right of the rectangle
     * @param {string} additional_options.notification_bubble_colour A HEX value representing the fill colour for
     * the notification bubble
     * @param {string} additional_options.list_content_element_id The element id of the html div containing our list
     * data that should be displayed when expanded
     * @param {boolean} additional_options.start_expanded Optional. If set to true, the object will render as
     * expanded from the start
     * @param {boolean} additional_options.prevent_collapse Optional. If set to true, the object will not have a
     * collapse toggle and cannot be collapsed
     * @param object_data Optional. An object containing data relevant to the object. This data is not necessarily used
     * on the canvas, but is available to the developer when needed
     * @param {number} canvas_id Optional. The id that will be used to detect this object on the canvas
     */
    constructor(dx_canvas_obj = null,
                draw_start_coords = {x:0,y:0},
                additional_options= {
                    is_draggable:false,
                    fill_colour:"#000000",
                    dimensions: {
                            width:100,
                            height:100,
                            expanded_dimensions: {
                                width:200,
                                height:200
                            }
                        }
                },
                object_data = {},
                canvas_id = -1) {
        super(dx_canvas_obj,draw_start_coords, additional_options, object_data, canvas_id);
        this.corner_radius = {top_left: 10, top_right: 10, bottom_right: 10, bottom_left: 10};
        // These values are percentages of the smallest side of the rectangle
    }

    /**
     * Initializes the relevant variables for this object
     */
    initializeObject() {
        this.image_obj = null
        this.is_expanded_bool = false;
        this.prevent_collapse = false;
        this.expand_toggle_icon_image_obj = null;
        this.collapse_toggle_icon_image_obj = null;
        this.expanded_width = 0;
        this.expanded_height = 0;
        this.content_padding = 5;
        this.line_width = 4;
        if (typeof this.additional_options["list_content_element_id"] === "undefined") {
            throw new Error("No content div provided for data list");
        }
        this.content_html_element = document.getElementById(this.additional_options["list_content_element_id"]);
        if (typeof this.content_html_element === "undefined") {
            throw new Error("Invalid content div provided for data list");
        }
        this.content_html_element.style.display = "none";
        this.content_html_element.style.position = "absolute";
        this.content_html_element.style.background = "#fff";
        this.content_html_element.style.overflow = "scroll";
        this.content_html_element.style.padding = this.content_padding+"px";

        this.expanded_width_reference = 0;
        this.expanded_height_reference = 0;
        this.relative_radius = {
            top_left:0,
            top_right:0,
            bottom_right:0,
            bottom_left:0
        }
    
        if (typeof this.additional_options["start_expanded"] !== "undefined") {
            this.is_expanded_bool = this.additional_options["start_expanded"];
        }
        if (typeof this.additional_options["prevent_collapse"] !== "undefined") {
            this.prevent_collapse = this.additional_options["prevent_collapse"];
        }

        this.placeholder_text = "";
        if (typeof this.additional_options["placeholder_text"] !== "undefined") {
            this.placeholder_text = this.additional_options["placeholder_text"];
        }
        super.initializeObject();

        if ((typeof this.additional_options["dimensions"]["expanded_dimensions"] !== "undefined") &&
            (typeof this.additional_options["dimensions"]["expanded_dimensions"]["width"] !== "undefined") &&
            (typeof this.additional_options["dimensions"]["expanded_dimensions"]["height"] !== "undefined")) {
            this.expanded_width_reference = this.additional_options["dimensions"]["expanded_dimensions"]["width"] - this.width;
            this.expanded_height_reference = this.additional_options["dimensions"]["expanded_dimensions"]["height"];
        }

        this.toggleExpandedContent();
    }

    /**
     * Helper function for this object that calculates the bounding coordinates
     */
    doBoundingCoordsCalculation() {
        this.bounding_rectangle_coords = {
            x1:this.x,
            y1:this.y,
            x2:this.x + this.width, // The current x2 point, including expansion
            x3:this.x + this.width - this.expanded_width, // The original x2 point without expansion
            y2:this.y + this.height + this.expanded_height, // The current y2 point, including expansion
            y3:this.y + this.height};// The original y2 point without expansion
    }
    
    /**
     * Updates the bounding coordinates for the object. Useful when the canvas is transformed to ensure that the
     * object is displayed correctly
     */
    updateBoundingCoords() {
        this.doBoundingCoordsCalculation();
        if (this.is_expanded_bool === true) {
            if (this.validateExpansionAllowed()) {
                this.content_html_element.style.display = "block";
            } else {
                this.content_html_element.style.display = "none";
            }
        }
        
        const screen_coords = this.getScreenCoordinates(this.dx_canvas_obj.getContext());
        const screen_width = screen_coords.x2 - screen_coords.x1 - (2*this.content_padding) - (2*this.line_width);
        const screen_height = screen_coords.y2 - screen_coords.y3 - (2*this.content_padding) - (2*this.line_width);

        const transform = this.dx_canvas_obj.context_obj.getTransform();

        this.content_html_element.style.width = screen_width+"px";
        this.content_html_element.style.height = screen_height+"px";
        this.content_html_element.style.left = (screen_coords.x1 + this.line_width + this.content_padding + dx_helpers.getWindowScrollPosition().x)+"px";
        this.content_html_element.style.top = (screen_coords.y3 + this.line_width + this.content_padding + dx_helpers.getWindowScrollPosition().y)+"px";
        this.content_html_element.style.borderBottomRightRadius = this.relative_radius.bottom_right+"px";
        this.content_html_element.style.borderBottomLeftRadius = this.relative_radius.bottom_left+"px";

        // Once the content is scaled too tiny, we just want to hide the html content
        if ((transform.a < 0.25) || (transform.d < 0.25)) {
            this.content_html_element.style.display = "none";
        }
    }
    
    /**
     * Returns the actual screen coordinates for this object
     * @param context_obj The context object of our canvas
     * @return {{y1: number, x1: number, y2: number, x2: number}}
     */
    getScreenCoordinates(context_obj = null) {
        const rect = this.dx_canvas_obj.canvas_obj.getBoundingClientRect();
        const transform = context_obj.getTransform();
        const rect_transformed =  {
            left:(rect.left + transform.e) / transform.a,
            top:(rect.top + transform.f) / transform.d,
            right:(rect.left + this.dx_canvas_obj.canvas_obj.width + transform.e) / transform.a,
            bottom:(rect.top + this.dx_canvas_obj.canvas_obj.height + transform.f) / transform.d,
        };
        return {
            x1:transform.a*(this.bounding_rectangle_coords.x1 + rect_transformed.left),
            y1:transform.d*(this.bounding_rectangle_coords.y1 + rect_transformed.top),
            x2:transform.a*(this.bounding_rectangle_coords.x2 + rect_transformed.left),
            y2:transform.d*(this.bounding_rectangle_coords.y2 + rect_transformed.top),
            y3:transform.d*(this.bounding_rectangle_coords.y3 + rect_transformed.top),
        };
    }
    
    /**
     * Draws the object while taking the current state of expansion into account
     * @param context_obj The context object of our canvas
     */
    drawObject(context_obj = null) {
        if (this.is_expanded_bool === true) {
            this.updateBoundingCoords();
        }
        super.drawObject(context_obj);
        this.drawExpandToggleIcon(context_obj);
    }
    
    /**
     * Draws the rectangle on the canvas
     * @param context_obj The context object of our canvas
     */
    drawObjectComponents(context_obj = null) {
        if (context_obj === null) {
            throw new Error("No context provided for object");
        }
        
        const border_radius_delta = this.width > this.height ? this.height : this.width;
        this.relative_radius = {
            top_left:border_radius_delta * (this.corner_radius.top_left / 100),
            top_right:border_radius_delta * (this.corner_radius.top_right / 100),
            bottom_right:border_radius_delta * (this.corner_radius.bottom_right / 100),
            bottom_left:border_radius_delta * (this.corner_radius.bottom_left / 100)
        }
        context_obj.save();
        context_obj.lineWidth = this.line_width;
        this.drawShadow(context_obj);
        if (this.is_expanded_bool === true) {
            context_obj.beginPath();
            context_obj.moveTo(this.x + this.relative_radius.top_left, this.y);
            context_obj.lineTo(this.x + this.width - this.relative_radius.top_right, this.y);
            context_obj.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + this.relative_radius.top_right);
            context_obj.lineTo(this.x + this.width, this.y + this.height);
            context_obj.lineTo(this.x, this.y + this.height);
            context_obj.lineTo(this.x, this.y + this.relative_radius.top_left);
            context_obj.quadraticCurveTo(this.x, this.y, this.x + this.relative_radius.top_left, this.y);
            context_obj.fillStyle = this.fill_colour;
            context_obj.fill();
            context_obj.closePath();

            let coords_with_lined_width = {
                x1: this.x + (this.line_width / 2),
                y1: this.y + this.height,
                x2: this.x + this.width - (this.line_width / 2),
                y2: this.y + this.height + this.expanded_height};

            // Draw the outline of the expanded area
            context_obj.beginPath();
            context_obj.moveTo(coords_with_lined_width.x2, coords_with_lined_width.y1);
            context_obj.lineTo(coords_with_lined_width.x2, coords_with_lined_width.y2 - this.relative_radius.bottom_right);
            context_obj.quadraticCurveTo(
                coords_with_lined_width.x2,
                coords_with_lined_width.y2,
                coords_with_lined_width.x2 - this.relative_radius.bottom_right,
                coords_with_lined_width.y2);
            context_obj.lineTo(coords_with_lined_width.x1 + this.relative_radius.bottom_left,
                coords_with_lined_width.y2);
            context_obj.quadraticCurveTo(
                coords_with_lined_width.x1,
                coords_with_lined_width.y2,
                coords_with_lined_width.x1,
                coords_with_lined_width.y2 - this.relative_radius.bottom_left);
            context_obj.lineTo(coords_with_lined_width.x1, coords_with_lined_width.y1);
            context_obj.strokeStyle = this.fill_colour;
            context_obj.stroke();
            context_obj.closePath();

            // Fill the expanded area. We do this separately because we want to retain our line width
            coords_with_lined_width = {
                x1: this.x + this.line_width,
                y1: this.y + this.height,
                x2: this.x + this.width - this.line_width,
                y2: this.y + this.height + this.expanded_height - (this.line_width / 2)};
            context_obj.beginPath();
            context_obj.moveTo(coords_with_lined_width.x2, coords_with_lined_width.y1);
            context_obj.lineTo(coords_with_lined_width.x2, coords_with_lined_width.y2 - this.relative_radius.bottom_right);
            context_obj.quadraticCurveTo(
                coords_with_lined_width.x2,
                coords_with_lined_width.y2,
                coords_with_lined_width.x2 - this.relative_radius.bottom_right,
                coords_with_lined_width.y2);
            context_obj.lineTo(coords_with_lined_width.x1 + this.relative_radius.bottom_left,
                coords_with_lined_width.y2);
            context_obj.quadraticCurveTo(
                coords_with_lined_width.x1,
                coords_with_lined_width.y2,
                coords_with_lined_width.x1,
                coords_with_lined_width.y2 - this.relative_radius.bottom_left);
            context_obj.lineTo(coords_with_lined_width.x1, coords_with_lined_width.y1);
            context_obj.fillStyle = "#ffffff";
            context_obj.fill()
            context_obj.closePath();

            // Write the placeholder text that is shown when the html content cannot be viewed
            const font_height = (coords_with_lined_width.y2 - coords_with_lined_width.y1) * 0.1; //10% Of the height
            context_obj.font = font_height+"px "+this.dx_canvas_obj.base_font_family;
            context_obj.fillStyle = "#000000C1";
            context_obj.textAlign = "center";
            const center_coords = {
                x:coords_with_lined_width.x1 + (coords_with_lined_width.x2 - coords_with_lined_width.x1) / 2,
                y:coords_with_lined_width.y1 + (coords_with_lined_width.y2 - coords_with_lined_width.y1) / 2};
            context_obj.fillText(this.placeholder_text, center_coords.x, center_coords.y);
            //console.log("Coords: "+JSON.stringify(coords_with_lined_width,null,2));
        } else {
            context_obj.beginPath();
            context_obj.moveTo(this.x + this.relative_radius.top_left, this.y);
            context_obj.lineTo(this.x + this.width - this.relative_radius.top_right, this.y);
            context_obj.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + this.relative_radius.top_right);
            context_obj.lineTo(this.x + this.width, this.y + this.height - this.relative_radius.bottom_right);
            context_obj.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - this.relative_radius.bottom_right, this.y + this.height);
            context_obj.lineTo(this.x + this.relative_radius.bottom_left, this.y + this.height);
            context_obj.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - this.relative_radius.bottom_left);
            context_obj.lineTo(this.x, this.y + this.relative_radius.top_left);
            context_obj.quadraticCurveTo(this.x, this.y, this.x + this.relative_radius.top_left, this.y);
            context_obj.fillStyle = this.fill_colour;
            context_obj.fill();
            context_obj.closePath();
        }
        context_obj.restore();
        
        // Let's add the provided image (if any) to the center of the rectangle
        if (typeof this.additional_options["image"] !== "undefined") {
            const img_coords = {x:this.bounding_rectangle_coords.x1+this.width/4,y:this.bounding_rectangle_coords.y1+this.height/4};
            if (this.image_obj === null) {
                this.image_obj = new Image();
                if (this.additional_options["image"].indexOf("http") !== -1) {
                    this.image_obj.src = this.additional_options["image"];
                } else {
                    this.image_obj.src = this.dx_canvas_obj.getDxCanvasRoot()+this.additional_options["image"];
                    this.image_obj.setAttribute('crossorigin', 'anonymous');
                }
            } else {
                context_obj.save();
                context_obj.drawImage(this.image_obj,img_coords.x,img_coords.y,this.width/2,this.height/2);
                context_obj.restore();
            }
        }
        
        // Let's add the provided text (if any) to the center of the rectangle
        if (typeof this.additional_options["text"] !== "undefined") {
            context_obj.save();
            const max_font_size = this.height / 4;
            let font_size = max_font_size;
            context_obj.font = "small-caps bold "+font_size+"px "+this.dx_canvas_obj.base_font_family;
            let text_width = Math.ceil(context_obj.measureText(this.additional_options["text"]).width);
            while (text_width > (this.width * 0.8)) {
                font_size = font_size - 0.5;
                context_obj.font = "small-caps bold "+font_size+"px "+this.dx_canvas_obj.base_font_family;
                text_width = Math.ceil(context_obj.measureText(this.additional_options["text"]).width);
            }
            const text_coords = {x:this.x + (this.width / 2),y: this.y + (this.height / 2) + (font_size / 4)};
            context_obj.fillStyle = '#000';
            if (typeof this.additional_options["text_colour"] !== "undefined") {
                context_obj.fillStyle = this.additional_options["text_colour"];
            }
            context_obj.textAlign = 'center';
            context_obj.fillText(this.additional_options["text"],text_coords.x,text_coords.y);
            context_obj.restore();
        }
        
    }
    
    /**
     * Draws the icon that indicates whether the component is expanded or collapsed
     * @param context_obj
     */
    drawExpandToggleIcon(context_obj = null) {
        if (this.prevent_collapse === true) {return;}
        if (context_obj === null) {
            throw new Error("No context provided for object");
        }
        const icon_height = this.height < this.width ? this.height / 4 : this.width / 4;
        const icon_width = icon_height;
        const img_coords = {x:this.bounding_rectangle_coords.x2 - (icon_width*2),y:this.bounding_rectangle_coords.y1+this.height/2 - (icon_height/2)}
        if ((this.expand_toggle_icon_image_obj === null) || (this.collapse_toggle_icon_image_obj === null)) {
            this.expand_toggle_icon_image_obj = new Image();
            this.expand_toggle_icon_image_obj.src = this.dx_canvas_obj.getDxCanvasRoot()+"assets/images/chevron-arrow-down.png";

            this.collapse_toggle_icon_image_obj = new Image();
            this.collapse_toggle_icon_image_obj.src = this.dx_canvas_obj.getDxCanvasRoot()+"assets/images/chevron-arrow-up.png";

            this.expand_toggle_icon_image_obj.setAttribute('crossorigin', 'anonymous');
            this.collapse_toggle_icon_image_obj.setAttribute('crossorigin', 'anonymous');
        } else if (this.is_expanded_bool === true) {
            context_obj.save();
            context_obj.drawImage(this.collapse_toggle_icon_image_obj,img_coords.x,img_coords.y,icon_width,icon_height);
            context_obj.restore();
        } else {
            context_obj.save();
            context_obj.drawImage(this.expand_toggle_icon_image_obj,img_coords.x,img_coords.y,icon_width,icon_height);
            context_obj.restore();
        }
    }
    
    /**
     * Determines whether to expand or collapse the object
     */
    onClick() {
        super.onClick();

        if (this.prevent_collapse === true) {return;}
        if (this.validateExpansionAllowed() === true) {
            this.is_expanded_bool = !this.is_expanded_bool;
        }
        this.toggleExpandedContent();
        this.updateBoundingCoords();
    }

    /**
     * Calculates the expanded values, based on what's provided in the object definition
     */
    calculateExpandedDimensions() {
        this.expanded_height = 0;
        this.expanded_width = 0;
        if ((typeof this.additional_options["dimensions"] !== "undefined") &&
            (this.additional_options["dimensions"]["width"] !== "undefined")) {
            this.width = this.additional_options["dimensions"]["width"];
        }
        if (this.is_expanded_bool === true) {
            this.expanded_width = this.expanded_width_reference;
            this.width = this.additional_options["dimensions"]["expanded_dimensions"]["width"];
            this.expanded_height = this.expanded_height_reference;
        }
    }

    /**
     * Shows or hides the relevant expanded content
     */
    toggleExpandedContent() {
        this.calculateExpandedDimensions();
        this.content_html_element.style.display = this.is_expanded_bool === true ? "block" : "none";
        this.updateAffectedCanvasObjects();
    }
    
    /**
     * Validates whether the object is allowed to be expanded, based on its position on the canvas
     * @return {boolean}
     */
    validateExpansionAllowed() {
        const rect = this.dx_canvas_obj.canvas_obj.getBoundingClientRect();
        const screen_coords = this.getScreenCoordinates(this.dx_canvas_obj.context_obj);
        if ((screen_coords.x1 < rect.left) ||
            (screen_coords.x2 > rect.right) ||
            (screen_coords.y1 < rect.top) ||
            (screen_coords.y2 > rect.bottom)) {
            return false;
        }
        return true
    }

    /**
     * Repositions all canvas objects that will be affected when this object expands or collapses
     */
    updateAffectedCanvasObjects() {
        const compare_coords = {x:this.bounding_rectangle_coords.x1,y:this.bounding_rectangle_coords.y3};

        for (const object_id of Object.keys(this.dx_canvas_obj.objects)) {
            const object = this.dx_canvas_obj.objects[object_id];
            let reposition_coords = {x:object.x,y:object.y};
            if (object.getBoundingRectangle().x2 > compare_coords.x) {
                reposition_coords.x = this.is_expanded_bool === true ?
                    object.x + this.expanded_width_reference :
                    object.x - this.expanded_width_reference;
            }
            if (object.getBoundingRectangle().y1 > compare_coords.y) {
                reposition_coords.y = this.is_expanded_bool === true ?
                    object.y + this.expanded_height_reference :
                    object.y - this.expanded_height_reference;
            }
            object.updateDeltas({x:object.x,y:object.y});
            object.reposition(reposition_coords);
        }
    }
}
//#endregion

//#region Helper functions
const dx_helpers = {
    /**
     * Converts the given html to a valid xml string
     * @param html The html to convert
     * @return {string}
     */
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
    },

    /**
     * Draws an arrowhead on a canvas
     * @param context_obj
     * @param x The x coordinate of the arrow's tip
     * @param y The y coordinate of the arrow's tip
     * @param radians The angle of the arrowhead in radians
     * @param arrow_length The length of the arrowhead
     */
    drawArrowhead(context_obj,x,y,radians,arrow_length = 25) {
        context_obj.save();
        context_obj.beginPath();
        context_obj.translate(x,y);
        context_obj.rotate(radians);
        context_obj.moveTo(0,0);
        context_obj.lineTo(10,arrow_length);
        context_obj.lineTo(-10,arrow_length);
        context_obj.closePath();
        context_obj.restore();
        context_obj.fill();
    },

    /**
     * Get the current scroll position of the document reliably
     * @returns {{x: number, y: number}}
     */
    getWindowScrollPosition() {
        const supportPageOffset = window.pageXOffset !== undefined;
        const isCSS1Compat = ((document.compatMode || "") === "CSS1Compat");

        const x = supportPageOffset ? window.pageXOffset : isCSS1Compat ? document.documentElement.scrollLeft : document.body.scrollLeft;
        const y = supportPageOffset ? window.pageYOffset : isCSS1Compat ? document.documentElement.scrollTop : document.body.scrollTop;

        return {x:x,y:y};
    }
}
//#endregion
