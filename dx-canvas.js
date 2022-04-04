//TODO:
// Improve connections with proper besier curves and arrows that are either horizontal or vertical, always
// Add various object types:
// - A Data model entity object
// - BPMN nodes (Activity, decision, etc)
// The ability to animate an object.
//  - Have a base animation class that deals with the animation basics and then child
//    classes for each animation type. Thinking initially of a jiggle type animation for when
//    DivbloxBaseHtmlCanvasObject is not allowed to expand, or when an object is not allowed to be dragged, etc

//#region The core DivbloxCanvas functionality
/**
 * Global definitions to be specified here.
 * @type {*[]}
 */
window.dxCanvasRegisteredEventHandlers = [];
/**
 * DivbloxCanvas manages the drawing and updating of a canvas along with user inputs
 */
class DivbloxCanvas {
    /**
     * Sets up the canvas, based on the provided html element id and then initializes the relevant objects defined
     * in the objects array
     * @param elementId The id of the html element that describes the canvas
     * @param objects An array of objects to initialize on the canvas. See examples/test-model.json for an example
     * @param options Additional options to pass
     * @param {string} options.dxCanvasRoot  The path to the root of dx-canvas.js. Needed to reference local
     * assets
     * @param {string} options.backgroundColor A HEX value that represents the background color of the canvas
     * @param {string} options.baseFontFamily A string value that represents the base font of the canvas
     * @param {boolean} options.mustFitToScreen Options. If set to true, the objects on the canvas will be zoomed to fit
     * on the screen
     * @param {boolean} options.isDebugModeActive Optional. If set to true, more logging will happen and certain elements will be
     * drawn on the screen to aid debugging
     * @param {boolean} options.isEditable Optional. If set to true, temporary objects will be added to the canvas after certain actions
     * @param {string} options.connectionsCurveType Optional. Can be either "straight" or "curved". If set,
     * DivbloxCanvas draws connections based on the provided option.
     */
    constructor(elementId = "dxCanvas", objects = [], options = {}) {
        this.canvas = document.getElementById(elementId);
        this.context = null;
        this.objectList = {};
        this.objectOrderedArray = [];
        this.objectUidMap = {};
        this.previousActiveObject = null;
        this.activeObject = null;
        this.isMouseDown = false;
        this.dragStart = {x: 0, y: 0};
        this.dragEnd = {x: 0, y: 0};
        this.dragTranslateFactor = 1;
        this.isDragging = false;
        this.zoomFactor = 0.02;
        this.zoomCurrent = 0;
        this.rootPath = "/";
        this.connectionsCurveType = "curved";
        
        if (typeof options["connectionsCurveType"] !== "undefined") {
            this.connectionsCurveType = options["connectionsCurveType"];
        }

        if (typeof options["dxCanvasRoot"] !== "undefined") {
            this.rootPath = options["dxCanvasRoot"];
        }
        this.backgroundColor = "#fff";
        if (typeof options["backgroundColor"] !== "undefined") {
            this.backgroundColor = options["backgroundColor"];
        }
        this.baseFontFamily = "arial";
        if (typeof options["baseFontFamily"] !== "undefined") {
            this.baseFontFamily = options["baseFontFamily"].toLowerCase();
        }
        this.isDebugModeActive = false;
        if (typeof options["isDebugModeActive"] !== "undefined") {
            this.isDebugModeActive = options["isDebugModeActive"];
        }
        this.isEditable = false;
        if (typeof options["isEditable"] !== "undefined") {
            this.isEditable = options["isEditable"];
        }

        this.mustFitToScreen = false;
        this.hasZoomedToFitAfterLoad = false;
        if (typeof options["mustFitToScreen"] !== "undefined") {
            this.mustFitToScreen = options["mustFitToScreen"];
        }

        this.setContext();
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.canvas.width = this.canvas.parentElement.clientWidth;

        this.eventHandlers = {
            'mousemove': this.onMouseMove,
            'mouseenter': this.onMouseEnter,
            'mouseleave': this.onMouseLeave,
            'mouseover': this.onMouseOver,
            'mouseout': this.onMouseOut,
            'mousedown': this.onMouseDown,
            'mouseup': this.onMouseUp,
            'click': this.onMouseClick,
            'dblclick': this.onMouseDoubleClick,
            'contextmenu': this.onMouseRightClick,
            'wheel': this.onMouseScroll
        };
        for (const event of Object.keys(this.eventHandlers)) {
            this.addCanvasEventListener(event,this.eventHandlers[event].bind(this));
        }
        for (const object of objects) {
            this.registerObject(this.initObjectFromJson(object));
        }
        window.requestAnimationFrame(this.update.bind(this));
    }

    /**
     * Registers an event handler for the canvas, but checks whether it already exists before attempting. This prevents
     * duplicate listeners and events from being handled when initializing multiple canvases on the same html element
     * @param {string} event The name of the event
     * @param {function} handler The function that handles the event
     */
    addCanvasEventListener(event, handler) {
        if (!window.dxCanvasRegisteredEventHandlers.includes(event)) {
            this.canvas.addEventListener(event, handler, false);
            window.dxCanvasRegisteredEventHandlers.push(event);
        }
    }

    /**
     * Instantiates a new object to be rendered on the canvas, based on the json provided
     * @param json The object to initialize
     * @param mustHandleError If this is false, no error will be presented in the console if the object type
     * does not exist. This is useful for when you override this function in a child class to prevent unnecessary
     * console errors
     * @return {null} An instance of the newly instantiated object or null
     */
    initObjectFromJson(json = {}, mustHandleError = true) {
        if (typeof json["type"] === "undefined") {
            throw new Error("No object type provided");
        }
        let objectToReturn = null;
        const canvasId = this.getNewCanvasId();
        switch (json["type"]) {
            //TODO: When new object types are defined, implement their instantiation in a child class that overrides
            // this method. This child method should pass false to mustHandleError and deal with it
            case 'DivbloxBaseCanvasObject':
                objectToReturn = new DivbloxBaseCanvasObject(this, {
                    x: json.x,
                    y: json.y
                }, json["additionalOptions"], json["data"], canvasId);
                break;
            case 'DivbloxBaseCircleCanvasObject':
                objectToReturn = new DivbloxBaseCircleCanvasObject(this, {
                    x: json.x,
                    y: json.y
                }, json["additionalOptions"], json["data"], canvasId);
                break;
            case 'DivbloxBaseRectangleCanvasObject':
                objectToReturn = new DivbloxBaseRectangleCanvasObject(this, {
                    x: json.x,
                    y: json.y
                }, json["additionalOptions"], json["data"], canvasId);
                break;
            case 'DivbloxBaseHtmlCanvasObject':
                objectToReturn = new DivbloxBaseHtmlCanvasObject(this, {
                    x: json.x,
                    y: json.y
                }, json["additionalOptions"], json["data"], canvasId);
                break;
            case 'DivbloxBaseTemporaryCircleCanvasObject':
                objectToReturn = new DivbloxBaseTemporaryCircleCanvasObject(this, {
                    x: json.x,
                    y: json.y
                }, json["additionalOptions"], json["data"], canvasId);
                break;
            default:
                if (mustHandleError === true) {
                    console.error("Invalid object type '" + json["type"] + "' provided");
                }
        }
        return objectToReturn;
    }

    /**
     * Returns an instance of an implementation of DivbloxBaseCanvasObject for the given canvas id
     * @param canvasId The canvas id to search on
     * @return {null|*}
     */
    getObjectByCanvasId(canvasId = -1) {
        if (typeof this.objectList[canvasId] === "undefined") {
            return null;
        }
        return this.objectList[canvasId];
    }

    /**
     * This function will return an object from below the cursor based on happening events
     * @param {MouseEvent} event object that contains information from a mouse event
     * @returns {null | DivbloxBaseCanvasObject | DivbloxBaseHtmlCanvasObject | DivbloxBaseRectangleCanvasObject | DivbloxBaseCircleCanvasObject | DivbloxBaseTemporaryCircleCanvasObject} this is an instance of the DivbloxBaseCanvasObject or one of its base children classes
     */
    getObjectByCoordinates(event) {
        let mouseCoordinates = this.getMousePosition(event);
        const reversedOrderArray = [...this.objectOrderedArray].reverse();
        for (const objectId of reversedOrderArray) {
            const object = this.objectList[objectId];
            if (object.temporaryCanvasObject) continue;
            if ((object.getBoundingRectangle().x1 <= mouseCoordinates.cx) &&
                (object.getBoundingRectangle().x2 >= mouseCoordinates.cx) &&
                (object.getBoundingRectangle().y1 <= mouseCoordinates.cy) &&
                (object.getBoundingRectangle().y2 >= mouseCoordinates.cy)) {
                return object;
            }
        }

        return null;
    }

    /**
     * Returns an instance of an implementation of DivbloxBaseCanvasObject for the given unique id
     * @param uid The unique id to search on
     * @return {null|*}
     */
    getObjectByUid(uid = -1) {
        if (typeof this.objectUidMap[uid] === "undefined") {
            return null;
        }
        return this.getObjectByCanvasId(this.objectUidMap[uid]);
    }

    /**
     * This function is meant to toggle hover states for objects the pointer enters and leaves
     * @param {{x: number, y: number, cx: number, cy: number}} mouseCoordinates these are the coordinates of the mouse relative to the canvas
     */
    toggleHoverState(mouseCoordinates) {
        let topHoveredObj = null;
        let allInHoverState = [];
        for (const objectId of this.objectOrderedArray) {
            const object = this.objectList[objectId];
            if ((object.getBoundingRectangle().x1 <= mouseCoordinates.cx) &&
                (object.getBoundingRectangle().x2 >= mouseCoordinates.cx) &&
                (object.getBoundingRectangle().y1 <= mouseCoordinates.cy) &&
                (object.getBoundingRectangle().y2 >= mouseCoordinates.cy) &&
                topHoveredObj === null) {
                topHoveredObj = object;
                continue;
            }
            if (object.inHoverState) {
                allInHoverState.push(object);
            }
        }

        if (topHoveredObj !== null && !topHoveredObj.inHoverState) {
            topHoveredObj.onMouseEnter(this);
        }

        for (const hoveredObject of allInHoverState) {
            if (topHoveredObj !== null && hoveredObject.uid === topHoveredObj.uid) {
                continue;
            }

            hoveredObject.onMouseLeave(this);
        }
    }

    /**
     * A wrapper for the canvase getContext method that updates our local context object
     */
    setContext() {
        if ((this.canvas === null) || (this.canvas === undefined)) {
            throw new Error("Canvas not initialized");
        }
        this.context = this.canvas.getContext('2d');
    }

    /**
     * Refreshes the canvas context and returns it
     * @return {null}
     */
    getContext() {
        this.setContext();
        return this.context;
    }

    /**
     * Returns the path to the root of dx-canvas.js.
     * @return {string} The path as a string
     */
    getDxCanvasRoot() {
        return this.rootPath;
    }

    /**
     * Cycles through the registered objects and draws them on the canvas
     */
    drawCanvas() {
        this.context.save();
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.restore();

        this.context.save();
        const transform = this.context.getTransform();
        const rectTransformed = {
            left: (-transform.e) / transform.a,
            top: (-transform.f) / transform.d,
            right: (this.canvas.width - transform.e) / transform.a,
            bottom: (this.canvas.height - transform.f) / transform.d,
        };
        this.context.beginPath();
        this.context.moveTo(rectTransformed.left, rectTransformed.top);
        this.context.lineTo(rectTransformed.right, rectTransformed.top);
        this.context.lineTo(rectTransformed.right, rectTransformed.bottom);
        this.context.lineTo(rectTransformed.left, rectTransformed.bottom);
        this.context.lineTo(rectTransformed.left, rectTransformed.top);
        this.context.fillStyle = this.backgroundColor;
        this.context.fill();
        this.context.closePath();
        this.context.restore();

        for (const objectId of this.objectOrderedArray) {
            const object = this.objectList[objectId];
            object.drawObject(this.context);
        }
    }

    /**
     * Resets all canvas transforms
     */
    resetCanvas() {
        this.context.setTransform(1, 0, 0, 1, 0, 0);
    }

    /**
     * This function is called recursively to update the canvas on every available animation frame
     */
    update() {
        this.drawCanvas();
        window.requestAnimationFrame(this.update.bind(this));
        if (this.mustFitToScreen && !this.hasZoomedToFitAfterLoad) {
            this.zoomToFitCurrentModel();
            this.hasZoomedToFitAfterLoad = true;
        }
    }

    /**
     * Adds the relevant object to the objects array
     * @param {DivbloxBaseCanvasObject | DivbloxBaseHtmlCanvasObject | DivbloxBaseRectangleCanvasObject | DivbloxBaseCircleCanvasObject | DivbloxBaseTemporaryCircleCanvasObject} object - this is an instance of the DivbloxBaseCanvasObject or one of its base children classes
     */
    registerObject(object = null) {
        if (object === null) {
            return;
        }

        this.objectList[object.getId()] = object;
        this.objectUidMap[object.getUid()] = object.getId();
        const activeObjectIndex = this.objectOrderedArray.indexOf(object.getId().toString());
        if (activeObjectIndex === -1) {
            this.objectOrderedArray.push(object.getId().toString());
        }
    }

    /**
     * Removes the relevant object from dx canvas object variables and, as a result, from the canvas
     * @param {DivbloxBaseCanvasObject | DivbloxBaseHtmlCanvasObject | DivbloxBaseRectangleCanvasObject | DivbloxBaseCircleCanvasObject | DivbloxBaseTemporaryCircleCanvasObject} object - this is an instance of the DivbloxBaseCanvasObject or one of its base children classes
     */
    deleteObject(object = null) {
        if (object === null) {
            return;
        }

        if (this.objectList.hasOwnProperty(object.getId())) {
            delete this.objectList[object.getId()];
        }

        if (this.objectUidMap.hasOwnProperty(object.getUid())) {
            delete this.objectUidMap[object.getUid()];
        }

        const activeObjectIndex = this.objectOrderedArray.indexOf(object.getId().toString());
        if (activeObjectIndex !== -1) {
            this.objectOrderedArray.splice(activeObjectIndex,1);
        }
    }

    /**
     * Here we loop through all objects on the canvas to make sure there are no references left in the connections attribute to the object of interest
     * @param {DivbloxBaseCanvasObject | DivbloxBaseHtmlCanvasObject | DivbloxBaseRectangleCanvasObject | DivbloxBaseCircleCanvasObject | DivbloxBaseTemporaryCircleCanvasObject} object - this is an instance of the DivbloxBaseCanvasObject or one of its base children classes
     * @summary This function gets called when an object from the divblox canvas gets deleted
     */
    removeLinksToObject(object = null) {
        if (object === null) {
            return;
        }

        let objectCount = Object.keys(this.objectList).length;
        let keys = Object.keys(this.objectList);
        for (const key of keys) {
            let connections = this.objectList[key].additionalOptions.connections ?? [];
            let index = connections.indexOf(object.uid);

            if (index >= 0) {
                connections.splice(index, 1);
            }
        }
    }

    /**
     * This function is very useful in cases when one would like to export a JSON of the canvas data but not include the temporary objects that do not contain useful information
     * @summary This is not actively used by the base implementation of the dx-canvas library
     */
    removeTemporaryObjects() {
        const reversedOrderArray = [...this.objectOrderedArray].reverse();
        for (const objectId of reversedOrderArray) {
            const object = this.objectList[objectId];
            if (object.uid.includes("temp_")) {
                this.removeLinksToObject(object);

                const activeObjectIndex = this.objectOrderedArray.indexOf(object.getId().toString());
                if (activeObjectIndex !== -1) {
                    this.objectOrderedArray.splice(activeObjectIndex,1);
                }

                if (this.objectUidMap.hasOwnProperty(object.getUid())) {
                    delete this.objectUidMap[object.getUid()];
                }

                if (this.objectList.hasOwnProperty(object.getId())) {
                    delete this.objectList[object.getId()];
                }
            }
        }
    }

    /**
     * Simply checks that a received event is not null. This throws an error when an expected event is null because
     * it would mean something went horribly wrong
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     */
    validateEvent(event = null) {
        this.setContext();
        if (event === null) {
            throw new Error("Invalid event provided");
        }
    }

    /**
     * Returns the position of the mouse on the canvas, honouring the transforms that were applied. This doesn't deal
     * with skew
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     * @return {{cx: number, cy: number, x: number, y: number}} cx & cy Are the mouse coordinates on the canvas
     */
    getMousePosition(event = null) {
        this.validateEvent(event);
        const rect = this.canvas.getBoundingClientRect();
        const transform = this.context.getTransform();
        const canvasX = (event.clientX - rect.left - transform.e) / transform.a;
        const canvasY = (event.clientY - rect.top - transform.f) / transform.d;
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            cx: canvasX,
            cy: canvasY
        };
    }

    /**
     * Handles the mouse move event
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     */
    onMouseMove(event = null) {
        this.validateEvent(event);
        const mouse = this.getMousePosition(event);

        if (this.activeObject !== null && !Object.keys(this.objectList).includes(this.activeObject.canvasId)) { // this will trigger after an object has been deleted from the canvas
            this.setActiveObject();
            this.isMouseDown = false;
        }

        if (this.isMouseDown) {
            this.dragEnd.x = mouse.cx;
            this.dragEnd.y = mouse.cy;
            this.updateDrag();
        }

        this.toggleHoverState(mouse);
    }

    /**
     * Handles the on mouse enter event
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     */
    onMouseEnter(event = null) {
        this.validateEvent(event);
        const mouse = this.getMousePosition(event);
    }

    /**
     * Handles the on mouse leave event
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     */
    onMouseLeave(event = null) {
        this.validateEvent(event);
        const mouse = this.getMousePosition(event);
    }

    /**
     * Handles the on mouse over event
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     */
    onMouseOver(event = null) {
        this.validateEvent(event);
        const mouse = this.getMousePosition(event);
    }

    /**
     * Handles the on mouse out event
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     */
    onMouseOut(event = null) {
        this.validateEvent(event);
        const mouse = this.getMousePosition(event);
    }

    /**
     * Handles the on mouse down event
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     */
    onMouseDown(event = null) {
        this.validateEvent(event);
        const mouse = this.getMousePosition(event);
        this.isMouseDown = true;
        this.dragEnd = {x: 0, y: 0};
        this.dragStart.x = mouse.cx;
        this.dragStart.y = mouse.cy;
        this.setActiveObject({x: mouse.cx, y: mouse.cy});
    }

    /**
     * Handles the on mouse up event
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     */
    onMouseUp(event = null) {
        this.validateEvent(event);
        const mouse = this.getMousePosition(event);
        this.isMouseDown = false;
        if (!this.isDragging) {
            // This was a click
            this.setActiveObject({x: mouse.cx, y: mouse.cy}, true);
        } else if (this.activeObject !== null) {
            this.activeObject.drawRelatedTemporaryObjects(this);
            this.activeObject.objectDropped(event, this);
        }
        this.isDragging = false;
    }

    /**
     * Handles the on mouse click event
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     */
    onMouseClick(event = null) {
        // We handle this with mouseup
    }

    /**
     * Handles the on mouse double click event
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     */
    onMouseDoubleClick(event = null) {
        this.validateEvent(event);
        const mouse = this.getMousePosition(event);
        if (this.activeObject !== null) {
            this.activeObject.onDoubleClick();
        }
    }

    /**
     * Handles the on mouse right click event
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     */
    onMouseRightClick(event = null) {
        this.validateEvent(event);
        event.preventDefault();
        const mouse = this.getMousePosition(event);
        if (this.isDebugModeActive === true) {
            console.log("Mouse right clicked at: " + JSON.stringify(mouse));
        }
    }

    /**
     * Handles the on mouse scroll event
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     */
    onMouseScroll(event = null) {
        this.validateEvent(event);
        event.preventDefault();
        const mouse = this.getMousePosition(event);
        this.zoomCanvas(event.deltaY / Math.abs(event.deltaY));
    }

    /**
     * Uses the current mouse position to determine the object to set as active
     * @param mouseDownPosition The position of the mouse where we want to check for an object
     * @param mustTriggerClick If true, then we trigger the onClick function of the relevant object
     */
    setActiveObject(mouseDownPosition = {x: 0, y: 0}, mustTriggerClick = false) {
        if (this.activeObject !== null) {
            this.previousActiveObject = this.activeObject;
        }
        this.activeObject = null;
        const reversedOrderArray = [...this.objectOrderedArray].reverse();
        for (const objectId of reversedOrderArray) {
            const object = this.objectList[objectId];
            if ((object.getBoundingRectangle().x1 <= mouseDownPosition.x) &&
                (object.getBoundingRectangle().x2 >= mouseDownPosition.x) &&
                (object.getBoundingRectangle().y1 <= mouseDownPosition.y) &&
                (object.getBoundingRectangle().y2 >= mouseDownPosition.y)) {
                this.activeObject = object;
                if (mustTriggerClick === true) {
                    this.activeObject.onClick();
                } else if (this.activeObject.temporaryCanvasObject) {
                    this.activeObject.onClick(this);
                }
                const activeObjIndex = this.objectOrderedArray.indexOf(objectId.toString());
                if (activeObjIndex !== (this.objectOrderedArray.length - 1)) {
                    this.objectOrderedArray.splice(activeObjIndex, 1);
                    this.objectOrderedArray.push(objectId.toString().toString());
                }
                break;
            }
        }

        if (this.previousActiveObject === null) return;

        if (this.activeObject !== null && !this.activeObject.temporaryCanvasObject) {
            setTimeout(function() {
                this.activeObject.drawRelatedTemporaryObjects(this);
            }.bind(this), 30);
        }

        if ((this.activeObject === null || this.activeObject.uid !== this.previousActiveObject.uid) && !this.previousActiveObject.temporaryCanvasObject) {
            this.previousActiveObject.removeRelatedTemporaryObjects(this);
        }

        if (this.activeObject !== null && this.activeObject.uid === this.previousActiveObject.uid) {
            this.previousActiveObject.removeRelatedTemporaryObjects(this);
            this.previousActiveObject.drawRelatedTemporaryObjects(this);
        }
    }

    /**
     * If an object is active, this method attempts to drag just that object on the canvas, otherwise it calculates
     * applies the correct transform while dragging the entire canvas
     */
    updateDrag() {
        const tx = this.context.getTransform();
        if (this.activeObject === null) {
            const translateX = this.dragTranslateFactor * (this.dragEnd.x - this.dragStart.x);
            const translateY = this.dragTranslateFactor * (this.dragEnd.y - this.dragStart.y);
            this.context.translate(translateX, translateY);
        } else {
            this.activeObject.removeRelatedTemporaryObjects(this);
            if (this.activeObject.isDraggable) {
                if (!this.isDragging) {
                    this.activeObject.updateDeltas({x: this.dragStart.x, y: this.dragStart.y});
                }
                this.activeObject.reposition({x: this.dragEnd.x, y: this.dragEnd.y});
                this.registerObject(this.activeObject);
            }
        }
        this.isDragging = true;
    }

    /**
     * Zooms the canvas either in or out
     * @param direction If equal to 1, then it zooms out, otherwise it zooms in
     */
    zoomCanvas(direction = -1) {
        let zoomFactor = 1 - this.zoomFactor;
        if (direction < 0) {
            zoomFactor = 1 + this.zoomFactor;
            this.zoomCurrent += this.zoomFactor;
        } else {
            this.zoomCurrent -= this.zoomFactor;
        }
        this.context.scale(zoomFactor, zoomFactor);
    }

    /**
     * Zooms the canvas to fit all of the current objects
     */
    zoomToFitCurrentModel() {
        this.zoomToFitCustom(this.canvas.getBoundingClientRect());
    }

    /**
     * Zooms the canvas to a level that contains the given boundaries
     * @param {{left:number,top:number,width:number,height:number}} boundaries The maximums that should be contained
     * within the zoomed canvas. These values are screen coordinates.
     */
    zoomToFitCustom(boundaries = {}) {
        this.resetCanvas();
        const canvasRect = this.canvas.getBoundingClientRect();
        const zoomPadding = {left: 5, top: 5, right: 5, bottom:15};
        const zoomPaddingTotals = {
            x: zoomPadding.left + zoomPadding.right,
            y: zoomPadding.top + zoomPadding.bottom
        };

        let isFitted = false;
        let counter = 0;
        let isZoomingOut = false;
        let isZoomingIn = false;
        let isZooming = false;
        let currentScreenBoundaries = this.getCanvasObjectScreenBoundaries();
        while (!isFitted) {
            const transform = this.context.getTransform();

            const currentWidthToFit = currentScreenBoundaries.x2 - currentScreenBoundaries.x1;
            const currentHeightToFit = currentScreenBoundaries.y2 - currentScreenBoundaries.y1;

            const compareWidth = (boundaries.width - zoomPaddingTotals.x) * (1 - this.zoomFactor);
            const compareHeight = (boundaries.height - zoomPaddingTotals.y) * (1 - this.zoomFactor);

            isZooming = false;
            if ((currentWidthToFit > compareWidth) ||
                (currentHeightToFit > compareHeight)) {
                // This means we need to zoom out
                this.zoomCanvas(1);
                isZoomingOut = isZooming = true;
            }
            if ((currentWidthToFit < compareWidth) &&
                (currentHeightToFit < compareHeight) && !isZoomingOut) {
                // This means we need to zoom in
                this.zoomCanvas(-1);
                isZoomingIn = isZooming = true;
            }
            currentScreenBoundaries = this.getCanvasObjectScreenBoundaries();
            if (!isZooming) {
                const valuesToPan = {
                    x: (-currentScreenBoundaries.x1 + boundaries.left + zoomPadding.left) / transform.a,
                    y: (-currentScreenBoundaries.y1 + boundaries.top + zoomPadding.top) / transform.d
                };
                this.context.translate(valuesToPan.x, valuesToPan.y);
                isFitted = true;
            } else {
                counter++;
                if (counter > 1000) {
                    isFitted = true;
                    console.error("Zoom to fit caused an infinite loop");
                }
            }
        }
    }

    /**
     * Returns the current maximum and minimum screen coordinates, calculated from all the objects on the canvas.
     * @return {{y1: number, x1: number, y2: number, x2: number}}
     */
    getCanvasObjectScreenBoundaries() {
        const context = this.getContext();
        const canvasRectangle = this.canvas.getBoundingClientRect();
        let screenBoundaries = {
            x1: canvasRectangle.left,
            y1: canvasRectangle.top,
            x2: 0,
            y2: 0}

        for (const objectId of Object.keys(this.objectList)) {
            const object = this.objectList[objectId];
            const objectScreenCoords = object.getScreenCoordinates(context);
            const objectScreenCoordsTranslated = {
                x1: objectScreenCoords.x1 + canvasRectangle.left,
                x2: objectScreenCoords.x2 + canvasRectangle.left,
                y1: objectScreenCoords.y1 + canvasRectangle.top,
                y2: objectScreenCoords.y2 + canvasRectangle.top}

            if (objectScreenCoordsTranslated.x2 > screenBoundaries.x2) {
                screenBoundaries.x2 = objectScreenCoordsTranslated.x2;
            }
            if (objectScreenCoordsTranslated.y2 > screenBoundaries.y2) {
                screenBoundaries.y2 = objectScreenCoordsTranslated.y2;
            }

            if (objectScreenCoordsTranslated.x1 < screenBoundaries.x1) {
                screenBoundaries.x1 = objectScreenCoordsTranslated.x1;
            }
            if (objectScreenCoordsTranslated.y1 < screenBoundaries.y1) {
                screenBoundaries.y1 = objectScreenCoordsTranslated.y1;
            }
        }
        return screenBoundaries;
    }

    /**
     * Returns a JSON string representation of the current canvas that can be used to reload it later
     * @param {boolean} mustPrettify If set to true, this will return the JSON in a more human-readable format
     * @returns {string} The JSON string
     */
    getCanvasJson(mustPrettify = true) {

        let exportArray = [];
        for (const objectId of Object.keys(this.objectList)) {
            const object = this.objectList[objectId];
            exportArray.push(object.getJson());
        }
        if (mustPrettify === true) {
            return JSON.stringify(exportArray,null,2);
        }
        return JSON.stringify(exportArray);
    }

    /**
     * Initiates an image download in the browser with the provided file name
     */
    downloadCanvasPng(fileName = 'exportedImage.png') {
        const linkSource = this.canvas.toDataURL('image/png');
        const downloadLink = document.createElement("a");
        downloadLink.href = linkSource;
        downloadLink.download = fileName;
        downloadLink.click();
    }

    /**
     * This function is used to generate a uuid for an object that is to be added to the canvas
     * The generation technique was taken from https://www.cryptosys.net/pki/uuid-rfc4122.html which makes it compliant
     * with RFC 4122
     * @return {string}
     */
    getNewCanvasId() {
        const genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        let random32CharStr = genRanHex(32);
        let char17 = parseInt(random32CharStr[17], 16);
        let mask = 1 << 3;
        if (char17 & mask == 0 || char17.toString(2).length < 4) {
            char17 |= mask;
        }
        mask = 0 << 2 | (1 << 2);
        if ((char17 & mask) != 0) {
            char17 ^= mask;
        }
        random32CharStr = random32CharStr.slice(0, 7) + "-" + random32CharStr.slice(7, 11) + "-4" + random32CharStr.slice(12, 15) + "-" + char17.toString(16) + random32CharStr.slice(16, 19) + "-" + random32CharStr.slice(19);

        return random32CharStr;
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
     * @param {*} dxCanvas The instance of the DivbloxCanvas object that controls the canvas
     * @param {{x: number, y: number}} drawStartCoords The x and y coordinates where this object is drawn from
     * @param additionalOptions Options specific to this object and how it is drawn and handled on the canvas
     * @param {string} additionalOptions.uid An optional, user-specified unique identifier for this object. Used to
     * link objects to each other
     * @param {boolean} additionalOptions.isDraggable If true, this object is draggable on the canvas
     * @param {string} additionalOptions.fillColour A HEX value representing the fill colour for the object
     * @param {{width:number, height:number}} additionalOptions.dimensions {} An object containing the width and
     * height of this canvas object
     * @param objectData Optional. An object containing data relevant to the object. This data is not necessarily used
     * on the canvas, but is available to the developer when needed
     * @param {string} canvasId Optional. The id that will be used to detect this object on the canvas
     * @param {boolean} temporaryCanvasObject
     */
    constructor(dxCanvas = null,
                drawStartCoords = {x: 0, y: 0},
                additionalOptions =
                    {
                        isDraggable: false,
                        fillColour: "#000000",
                        dimensions:
                            {width: 100, height: 100}
                    },
                objectData = {},
                canvasId = "-1",
                temporaryCanvasObject = false) {
        if (dxCanvas === null) {
            throw new Error("DivbloxCanvas not provided to DivbloxBaseCanvasObject")
        }
        this.dxCanvas = dxCanvas;
        if (canvasId === "-1") {
            this.canvasId = dxCanvas.getNewCanvasId();
        } else {
            this.canvasId = canvasId;
        }
        this.uid = this.canvasId;
        this.x = drawStartCoords.x;
        this.y = drawStartCoords.y;
        this.xDelta = this.x;
        this.yDelta = this.y;
        this.width = 100;
        this.height = 100;
        this.additionalOptions = {};
        if (typeof additionalOptions !== "undefined") {
            this.additionalOptions = additionalOptions;
        }
        if (typeof this.additionalOptions["uid"] !== "undefined") {
            this.uid = this.additionalOptions["uid"];
        }
        this.objectData = objectData;
        this.showBoundingBox = this.dxCanvas.isDebugModeActive; //Debug purposes
        this.notificationBubbleRadius = 0;
        this.notificationBubbleColour = '#FF0000';
        this.notificationBubbleCoords = {x: this.x, y: this.y};
        this.temporaryCanvasObject = temporaryCanvasObject;
        this.inHoverState = false;
        this.temporaryObjectControllersDrawn = false;
        this.initializeObject();
    }

    /**
     * Initializes the relevant variables for this object
     */
    initializeObject() {
        if (typeof this.additionalOptions["dimensions"] !== "undefined") {
            if (this.additionalOptions["dimensions"]["width"] !== "undefined") {
                this.width = this.additionalOptions["dimensions"]["width"];
            }
            if (this.additionalOptions["dimensions"]["height"] !== "undefined") {
                this.height = this.additionalOptions["dimensions"]["height"];
            }
        }
        this.updateBoundingCoords();
        this.fillColour = '#000000';
        if (typeof this.additionalOptions["fillColour"] !== "undefined") {
            this.fillColour = this.additionalOptions["fillColour"];
        }
        this.isDraggable = false;
        if (typeof this.additionalOptions["isDraggable"] !== "undefined") {
            this.isDraggable = this.additionalOptions["isDraggable"];
        }
        this.updateNotificationBubbleProperties();
    }

    /**
     * Updates the properties of the notification bubble that could be displayed at the top right of the object
     */
    updateNotificationBubbleProperties() {
        if (typeof this.additionalOptions["notificationBubbleColour"] !== "undefined") {
            this.notificationBubbleColour = this.additionalOptions["notificationBubbleColour"];
        }
        this.notificationBubbleRadius = Math.round(this.height * 0.25);
        this.notificationBubbleCoords = {
            x: this.x + this.width,
            y: this.y
        };
    }

    /**
     * Updates the bounding coordinates for the object. Useful when the canvas is transformed to ensure that the
     * object is displayed correctly
     */
    updateBoundingCoords() {
        this.boundingRectangleCoords = {x1: this.x, y1: this.y, x2: this.x + this.width, y2: this.y + this.height};
    }

    /**
     * Returns the canvas id associated with this object
     * @return {string}
     */
    getId() {
        return this.canvasId;
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
        return this.boundingRectangleCoords;
    }

    /**
     * This base class simply draws a rectangle, but this function should be overridden for more complex shapes
     * @param {CanvasRenderingContext2D} context The context object of our canvas
     */
    drawObject(context = null) {
        if (context === null) {
            throw new Error("No context provided for object");
        }
        this.updateNotificationBubbleProperties();
        this.drawObjectComponents(context);
        this.drawNotificationBubble(context);
        this.drawObjectConnections(context);
        if (this.showBoundingBox) {
            this.drawBoundingBox(context); //Debug purposes
        }
    }

    /**
     * Draws the canvas components that make up this object
     * @param {CanvasRenderingContext2D} context The context object of our canvas
     */
    drawObjectComponents(context = null) {
        context.save();
        this.drawShadow(context);
        context.fillStyle = this.fillColour;
        context.fillRect(this.x, this.y, this.width, this.height);
        context.restore();
    }

    /**
     * Draws the connectors from this object to its specified connections
     * @param {CanvasRenderingContext2D} context The context object of our canvas
     */
    drawObjectConnections(context = null) {
        if ((typeof this.additionalOptions["connections"] === "undefined") || (this.additionalOptions["connections"].length === 0)) {
            return;
        }
        let arrowHeadLength = 18;
        for (const connectionUid of this.additionalOptions["connections"]) {
            const connectedObj = this.dxCanvas.getObjectByUid(connectionUid);
            if (connectedObj === null) {
                continue;
            }
            const connectedObjBoundingRectangle = connectedObj.getBoundingRectangle();
            if ((connectedObjBoundingRectangle.x1 <= this.boundingRectangleCoords.x2) &&
                (connectedObjBoundingRectangle.y1 <= this.boundingRectangleCoords.y2) &&
                (connectedObjBoundingRectangle.x2 >= this.boundingRectangleCoords.x1) &&
                (connectedObjBoundingRectangle.y2 >= this.boundingRectangleCoords.y1)) {
                continue;
            }
            let connectorCoords = {
                x1: this.boundingRectangleCoords.x1 + ((this.boundingRectangleCoords.x2 - this.boundingRectangleCoords.x1) / 2),
                y1: this.boundingRectangleCoords.y1 + ((this.boundingRectangleCoords.y2 - this.boundingRectangleCoords.y1) / 2),
                x2: connectedObjBoundingRectangle.x1 + ((connectedObjBoundingRectangle.x2 - connectedObjBoundingRectangle.x1) / 2),
                y2: connectedObjBoundingRectangle.y1 + ((connectedObjBoundingRectangle.y2 - connectedObjBoundingRectangle.y1) / 2),
                centralX1: this.boundingRectangleCoords.x1 + ((this.boundingRectangleCoords.x2 - this.boundingRectangleCoords.x1) / 2),
                centralX2: connectedObjBoundingRectangle.x1 + ((connectedObjBoundingRectangle.x2 - connectedObjBoundingRectangle.x1) / 2),
                centralY1: this.boundingRectangleCoords.y1 + ((this.boundingRectangleCoords.y2 - this.boundingRectangleCoords.y1) / 2),
                centralY2: connectedObjBoundingRectangle.y1 + ((connectedObjBoundingRectangle.y2 - connectedObjBoundingRectangle.y1) / 2),
                arrowX: 0,
                arrowY: 0,
                deltaX: 0,
                deltaY: 0,
                cp1x: 0,
                cp1y: 0,
                cp2x: 0,
                cp2y: 0,
            };
            const controlPointFactor = this.dxCanvas.connectionsCurveType === "curved" ? 0.9 : 0;
            const angleAdjustmentFactor = this.dxCanvas.connectionsCurveType === "curved" ? 0.3 : 1;
            let controlPointFactors = {x: 0,y: 0};
            let arrowAngle = 0;
            let minimumDistance = arrowHeadLength;
            
            if ((Math.abs(connectorCoords.centralX2 - connectorCoords.centralX1) >
                Math.abs(connectorCoords.centralY2 - connectorCoords.centralY1)) &&
                ((connectedObjBoundingRectangle.x1 > this.boundingRectangleCoords.x2) ||
                (connectedObjBoundingRectangle.x2 < this.boundingRectangleCoords.x1))) {
                // This means we should treat the connected object as "on the side"
                controlPointFactors.x = controlPointFactor;
                if (connectorCoords.centralX2 > connectorCoords.centralX1) {
                    // On the right side
                    connectorCoords.x1 = this.boundingRectangleCoords.x2;
                    connectorCoords.x2 = connectedObjBoundingRectangle.x1;
                    arrowAngle = 90 * Math.PI / 180;
                    connectorCoords.arrowX = 1;
                } else {
                    // On the left side
                    connectorCoords.x1 = this.boundingRectangleCoords.x1;
                    connectorCoords.x2 = connectedObjBoundingRectangle.x2;
                    arrowAngle = 270 * Math.PI / 180;
                    connectorCoords.arrowX = -1;
                }
                if (Math.abs(connectorCoords.x2 - connectorCoords.x1) < minimumDistance) {
                    minimumDistance = Math.abs(connectorCoords.x2 - connectorCoords.x1);
                }
            } else {
                // This means we should treat the connected object as "on the top or bottom"
                controlPointFactors.y = controlPointFactor;
                if (connectorCoords.centralY2 > connectorCoords.centralY1) {
                    // Below
                    connectorCoords.y1 = this.boundingRectangleCoords.y2;
                    connectorCoords.y2 = connectedObjBoundingRectangle.y1;
                    controlPointFactors.y = controlPointFactor;
                    arrowAngle = 180 * Math.PI / 180;
                    connectorCoords.arrowY = -1;
                } else {
                    // Above
                    connectorCoords.y1 = this.boundingRectangleCoords.y1;
                    connectorCoords.y2 = connectedObjBoundingRectangle.y2;
                    controlPointFactors.y = controlPointFactor;
                    arrowAngle = 360 * Math.PI / 180;
                    connectorCoords.arrowY = 1;
                }
                if (Math.abs(connectorCoords.y2 - connectorCoords.y1) < minimumDistance) {
                    minimumDistance = Math.abs(connectorCoords.y2 - connectorCoords.y1);
                }
            }
            
            if (connectorCoords.arrowX !== 0) {
                connectorCoords.deltaX = connectorCoords.x2 - connectorCoords.x1;
                connectorCoords.deltaY = connectorCoords.centralY2 - connectorCoords.centralY1;
                arrowAngle += angleAdjustmentFactor * Math.atan(connectorCoords.deltaY / connectorCoords.deltaX);
            }
            if (connectorCoords.arrowY !== 0) {
                connectorCoords.deltaX = connectorCoords.centralX2 - connectorCoords.centralX1;
                connectorCoords.deltaY = connectorCoords.y2 - connectorCoords.y1;
                arrowAngle -= angleAdjustmentFactor * Math.atan(connectorCoords.deltaX / connectorCoords.deltaY);
            }
            
            connectorCoords.cp1x = connectorCoords.x1 + (controlPointFactors.x * connectorCoords.deltaX);
            connectorCoords.cp2x = connectorCoords.x2 - (controlPointFactors.x * connectorCoords.deltaX);
            connectorCoords.cp1y = connectorCoords.y1 + (controlPointFactors.y * connectorCoords.deltaY);
            connectorCoords.cp2y = connectorCoords.y2 - (controlPointFactors.y * connectorCoords.deltaY);
        
            context.save();
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(connectorCoords.x1, connectorCoords.y1);
    
            context.bezierCurveTo(
                connectorCoords.cp1x, connectorCoords.cp1y,
                connectorCoords.cp2x, connectorCoords.cp2y,
                connectorCoords.x2,
                connectorCoords.y2);
            context.stroke();
            context.closePath();
            context.restore();
            
            if (minimumDistance < arrowHeadLength) {
                arrowHeadLength = minimumDistance / 2;
            }
            dxHelpers.drawArrowhead(context, connectorCoords.x2, connectorCoords.y2, arrowAngle, arrowHeadLength);
        }
    }

    /**
     * Draws the notification bubble at the top right of the object if it is required
     * @param {CanvasRenderingContext2D} context The context object of our canvas
     */
    drawNotificationBubble(context = null) {
        if (context === null) {
            throw new Error("No context provided for object");
        }
        // If we have notifications count higher than 0, let's draw the notification bubble
        if ((typeof this.additionalOptions["notificationCount"] !== "undefined") && (this.additionalOptions["notificationCount"] > 0)) {
            // Let's draw the notification counter and its containing bubble
            context.save();

            const counterText = this.additionalOptions["notificationCount"];
            context.font = "small-caps bold " + this.notificationBubbleRadius + "px " + this.dxCanvas.baseFontFamily;

            const counterTextWidth = Math.ceil(context.measureText(counterText).width) > (this.notificationBubbleRadius) ?
                Math.floor(context.measureText(counterText).width - (this.notificationBubbleRadius / 2)) : 0;

            const bubbleArcCoords = {
                x1: this.notificationBubbleCoords.x,
                y1: this.notificationBubbleCoords.y,
                x2: this.notificationBubbleCoords.x + counterTextWidth,
                y2: this.notificationBubbleCoords.y
            };

            context.fillStyle = this.notificationBubbleColour;

            context.beginPath();
            context.moveTo(bubbleArcCoords.x1, bubbleArcCoords.y1);
            context.arc(bubbleArcCoords.x1, bubbleArcCoords.y1, this.notificationBubbleRadius, 270 * (Math.PI / 180), 90 * (Math.PI / 180), true);
            context.fill();
            context.closePath();
            context.beginPath();
            context.moveTo(bubbleArcCoords.x2, bubbleArcCoords.y2);
            context.arc(bubbleArcCoords.x2, bubbleArcCoords.y2, this.notificationBubbleRadius, 270 * (Math.PI / 180), 90 * (Math.PI / 180), false);
            context.fill();
            context.closePath();

            context.beginPath();
            context.rect(bubbleArcCoords.x1 - 0.5, bubbleArcCoords.y1 - this.notificationBubbleRadius, counterTextWidth + 0.75, this.notificationBubbleRadius * 2);
            context.fill();

            let textCoords = {
                x: (bubbleArcCoords.x1 + bubbleArcCoords.x2) / 2,
                y: Math.ceil(this.notificationBubbleCoords.y + (this.notificationBubbleRadius / 4))
            }

            context.fillStyle = '#fff';
            context.textAlign = 'center';
            context.fillText(counterText, textCoords.x, textCoords.y);

            context.restore();
        }
    }

    /**
     * This function will manage the drawing of all temporary objects linked to a non-temporary object
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class. It is passed as the whole canvas needs to be updated after changes
     */
    drawRelatedTemporaryObjects(dxCanvasObj) {
        if (this.temporaryObjectControllersDrawn || this.temporaryCanvasObject || !dxCanvasObj.isEditable) {
            return;
        }
        
        this.drawTempArrowHeads(dxCanvasObj);
        this.drawTempObjectControllers(dxCanvasObj);

        window.requestAnimationFrame(dxCanvasObj.update.bind(dxCanvasObj));
        this.temporaryObjectControllersDrawn = true;
    }

    /**
     * We use the DivbloxCanvas instance to search through all the temporary objects rendered on the canvas and that have a parameter "linkFrom" matching the current objects uid. If found, they are removed using the DivbloxCanvas deleteObject function.
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class. It is passed as the whole canvas needs to be updated after changes
     * @summary This function will remove all temporary objects linked to the current object.
     */
    removeRelatedTemporaryObjects(dxCanvasObj) {
        if (!this.temporaryObjectControllersDrawn || !dxCanvasObj.isEditable) return;

        const reversedOrderArray = [...dxCanvasObj.objectOrderedArray].reverse();
        for (const objectId of reversedOrderArray) {
            const object = dxCanvasObj.objectList[objectId];
            if (
                object.additionalOptions.hasOwnProperty("linkFrom") &&
                object.additionalOptions.linkFrom == this.getUid() &&
                (object.additionalOptions.uid.includes("temp_arrowmaker") ||
                    object.additionalOptions.uid.includes("temp_delete"))
            ) {
                dxCanvasObj.deleteObject(object);
            }
        }

        window.requestAnimationFrame(dxCanvasObj.update.bind(dxCanvasObj));
        this.temporaryObjectControllersDrawn = false;
    }
    
    /**
     * This function draws the arrow heads around a non-temporary canvas object that has been selected
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class. It is passed as the whole canvas needs to be updated after changes
     */
    drawTempArrowHeads(dxCanvasObj) {
        const currentObjectCoords = this.getBoundingRectangle();
        const arrowCoordinates = [
            {
                x: (currentObjectCoords.x2 - currentObjectCoords.x1) / 2 + currentObjectCoords.x1,
                y: currentObjectCoords.y2 + 10
            },
            {
                x: (currentObjectCoords.x2 - currentObjectCoords.x1) / 2 + currentObjectCoords.x1,
                y: currentObjectCoords.y1 - 10
            },
            {
                x: currentObjectCoords.x1 - 10,
                y: (currentObjectCoords.y2 - currentObjectCoords.y1) / 2 + currentObjectCoords.y1
            },
            {
                x: currentObjectCoords.x2 + 10,
                y: (currentObjectCoords.y2 - currentObjectCoords.y1) / 2 + currentObjectCoords.y1
            },
        ];
        const arrowPosition = ["down", "up", "left", "right"];

        for (let i = 0; i < arrowPosition.length; i++) {
            const newObject = {
                "type": "DivbloxBaseTemporaryCircleCanvasObject",
                "x": arrowCoordinates[i].x,
                "y": arrowCoordinates[i].y,
                "additionalOptions": {
                    "drawShadow": false,
                    "uid": "temp_arrowmaker_"+arrowPosition[i],
                    "isDraggable": false,
                    "fillColour": 'rgba(0,0,0,0)',
                    "dimensions": {
                        "radius": 10
                    },
                    "image": "assets/images/chevron-arrow-" + arrowPosition[i] + ".png",
                    "linkFrom": this.getUid()
                },
                "data": {}
            }

            dxCanvasObj.registerObject(dxCanvasObj.initObjectFromJson(newObject));
        }
    }


    /**
     * This function will draw temporary object controllers around the selected canvas object. These object will allow modifying features of the non-temporary object. Currently, we only add the delete controller that allows you to delete the object from the canvas.
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class. It is passed as the whole canvas needs to be updated after changes
     */
    drawTempObjectControllers (dxCanvasObj) {
        const currentObjectCoords = this.getBoundingRectangle();

        const newObject = {
            "type": "DivbloxBaseTemporaryCircleCanvasObject",
            "x": currentObjectCoords.x1,
            "y": currentObjectCoords.y1,
            "additionalOptions": {
                "drawShadow": false,
                "uid": "temp_delete",
                "isDraggable": false,
                "fillColour": 'rgba(0,0,0,0)',
                "dimensions": {
                    "radius": 15
                },
                "image": "assets/images/delete.svg",
                "linkFrom": this.getUid()
            },
            "data": {}
        }

        dxCanvasObj.registerObject(dxCanvasObj.initObjectFromJson(newObject));
    }

    /**
     * This functions handles the on click event for this object. This should be implemented in a child class
     */
    onClick() {
        if (this.dxCanvas.isDebugModeActive === true) {
            console.log("Object " + this.getId() + " clicked");
        }
    }

    /**
     * This functions handles the on double click event for this object. This should be implemented in a child class
     */
    onDoubleClick() {
        if (this.dxCanvas.isDebugModeActive === true) {
            console.log("Object " + this.getId() + " double clicked");
        }
    }

    /**
     * This function handles the on mouse enter for this object. This should be implemented in a child class
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class. It is passed as the whole canvas needs to be updated after changes
     */
    onMouseEnter(dxCanvasObj) {
        if (this.dxCanvas.isDebugModeActive === true) {
            console.log("Object " + this.getId() + " mouse entered");
        }
    }

    /**
     * This function handles the on mouse leave for this object. This should be implemented in a child class
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class. It is passed as the whole canvas needs to be updated after changes
     */
    onMouseLeave(dxCanvasObj) {
        if (this.dxCanvas.isDebugModeActive === true) {
            console.log("Object " + this.getId() + " mouse left");
        }
    }

    /**
     * This is a function that will be called when an object is dropped after being dragged. This should be implemented in a child class
     * @param {MouseEvent} event - this object passed from javascript from end through the DivbloxCanvas class object
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class. It is passed as the whole canvas needs to be updated after changes
     */
    objectDropped(event, dxCanvasObj) {
        if (this.dxCanvas.isDebugModeActive === true) {
            console.log("Object " + this.getId() + " dropped");
        }
    }

    /**
     * Calculates x and y deltas based on the provided reference coordinates. Useful when dragging the object
     * @param {{x: number, y: number}} referenceCoords The reference coordinates provided
     */
    updateDeltas(referenceCoords = {x: 0, y: 0}) {
        this.xDelta = referenceCoords.x - this.x;
        this.yDelta = referenceCoords.y - this.y;
    }

    /**
     * Repositions the object to the coordinates provided
     * @param {{x: number, y: number}} coords The x and y coordinates to move to
     */
    reposition(coords = {x: 0, y: 0}) {
        this.x = coords.x - this.xDelta;
        this.y = coords.y - this.yDelta;
        this.updateBoundingCoords();
    }

    /**
     * Returns a JSON representation of this object
     * @return {{data: {}, x: number, y: number, additionalOptions: (*|{}|{isDraggable: boolean, fillColour: string, dimensions: {width: number, height: number}}), type: string}}
     */
    getJson() {
        return {
            "type": this.constructor.name,
            "x": this.x,
            "y": this.y,
            "additionalOptions": this.additionalOptions,
            "data": this.objectData
        };
    }

    /**
     * Draws a shadow under the object
     * @param {CanvasRenderingContext2D} context The context object of our canvas
     */
    drawShadow(context = null) {
        if (context === null) {
            throw new Error("No context provided for object");
        }
        context.shadowColor = "#0000001F";
        context.shadowBlur = 10;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
    }

    /**
     * Draws the bounding box for this object. This function is used for debug purposes to see the area that an
     * object occupies
     * @param {CanvasRenderingContext2D} context The context object of our canvas
     */
    drawBoundingBox(context = null) {
        if (context === null) {
            throw new Error("No context provided for object");
        }

        context.save();
        context.lineWidth = 0.5;
        context.beginPath();
        context.moveTo(this.boundingRectangleCoords.x1, this.boundingRectangleCoords.y1);
        context.lineTo(this.boundingRectangleCoords.x2, this.boundingRectangleCoords.y1);
        context.lineTo(this.boundingRectangleCoords.x2, this.boundingRectangleCoords.y2);
        context.lineTo(this.boundingRectangleCoords.x1, this.boundingRectangleCoords.y2);
        context.lineTo(this.boundingRectangleCoords.x1, this.boundingRectangleCoords.y1);
        context.fillStyle = "#000000";
        context.closePath();
        context.stroke();
        context.restore();
    }

    /**
     * Returns the actual screen coordinates for this object
     * @param {CanvasRenderingContext2D} context The context object of our canvas
     * @return {{y1: number, x1: number, y2: number, x2: number}}
     */
    getScreenCoordinates(context = null) {
        const rect = this.dxCanvas.canvas.getBoundingClientRect();
        const transform = context.getTransform();
        return {
            x1: transform.a * (this.boundingRectangleCoords.x1 + rect.left + transform.e),
            y1: transform.d * (this.boundingRectangleCoords.y1 + rect.top + transform.f),
            x2: transform.a * (this.boundingRectangleCoords.x2 + rect.left + transform.e),
            y2: transform.d * (this.boundingRectangleCoords.y2 + rect.top + transform.f),
        };
    }
}

/**
 * The DivbloxBaseCircleCanvasObject is basically a circle that is filled with a specified colour, has an optional image
 * in its center and also has an optional notification indicator at its top right
 *  [x]
 * / x \
 *  \_/
 *
 */
class DivbloxBaseCircleCanvasObject extends DivbloxBaseCanvasObject {
    /**
     * Initializes the relevant data for the object
     * @param {*} dxCanvas The instance of the DivbloxCanvas object that controls the canvas
     * @param {{x: number, y: number}} drawStartCoords The x and y coordinates where this object is drawn from
     * @param additionalOptions Options specific to this object and how it is drawn and handled on the canvas
     * @param {string} additionalOptions.uid An optional, user-specified unique identifier for this object. Used to
     * link objects to each other
     * @param {boolean} additionalOptions.isDraggable If true, this object is draggable on the canvas
     * @param {string} additionalOptions.fillColour A HEX value representing the fill colour for the object
     * @param {{radius:number}} additionalOptions.dimensions {} An object containing the radius of this canvas object
     * @param {string} additionalOptions.image {} Optional. The path to the image that should be displayed in the
     * center of the circle
     * @param {number} additionalOptions.notificationCount {} Optional. A number to display in a notification
     * bubble at the top right of the circle
     * @param {string} additionalOptions.notificationBubbleColour A HEX value representing the fill colour for
     * the notification bubble
     * @param objectData Optional. An object containing data relevant to the object. This data is not necessarily used
     * on the canvas, but is available to the developer when needed
     * @param {string} canvasId Optional. The id that will be used to detect this object on the canvas
     */
    constructor(dxCanvas = null,
                drawStartCoords = {x: 0, y: 0},
                additionalOptions = {
                    isDraggable: false,
                    fillColour: "#000000",
                    dimensions:
                        {radius: 15}
                },
                objectData = {},
                canvasId = "-1") {
        super(dxCanvas, drawStartCoords, additionalOptions, objectData, canvasId);
    }

    /**
     * Initializes the relevant variables for this object
     */
    initializeObject() {
        this.imageObj = null;
        this.radius = 10;
        if (typeof this.additionalOptions["dimensions"] !== "undefined") {
            if (typeof this.additionalOptions["dimensions"]["radius"] !== "undefined") {
                this.radius = this.additionalOptions["dimensions"]["radius"];
            }
        }
        super.initializeObject();
    }

    /**
     * Updates the properties of the notification bubble that could be displayed at the top right of the object
     */
    updateNotificationBubbleProperties() {
        if (typeof this.additionalOptions["notificationBubbleColour"] !== "undefined") {
            this.notificationBubbleColour = this.additionalOptions["notificationBubbleColour"];
        }
        this.notificationBubbleRadius = Math.round(this.radius * 0.25);
        this.notificationBubbleCoords = {
            x: this.x + (this.radius * Math.cos(315 * (Math.PI / 180))),
            y: this.y + (this.radius * Math.sin(315 * (Math.PI / 180)))
        };
    }

    /**
     * Updates the bounding coordinates for the object based on the circle's radius
     */
    updateBoundingCoords() {
        this.boundingRectangleCoords =
            {
                x1: this.x - this.radius,
                y1: this.y - this.radius,
                x2: this.x + this.radius,
                y2: this.y + this.radius
            };
    }

    /**
     * Draws the circle on the canvas
     * @param {CanvasRenderingContext2D} context The context object of our canvas
     */
    drawObjectComponents(context = null) {
        if (context === null) {
            throw new Error("No context provided for object");
        }
        // Start drawing the main object
        context.save();
        this.drawShadow(context);
        context.beginPath();
        context.moveTo(this.x, this.y);
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
        context.fillStyle = this.fillColour;
        context.fill();
        context.restore();

        // Let's add the provided image (if any) to the center of the circle
        if (typeof this.additionalOptions["image"] !== "undefined") {
            const width = this.boundingRectangleCoords.x2 - this.boundingRectangleCoords.x1;
            const height = this.boundingRectangleCoords.y2 - this.boundingRectangleCoords.y1;
            const imgCoords = {
                x: this.boundingRectangleCoords.x1 + width / 4,
                y: this.boundingRectangleCoords.y1 + height / 4
            }
            if (this.imageObj === null) {
                this.imageObj = new Image();
                if (this.additionalOptions["image"].indexOf("http") !== -1) {
                    this.imageObj.src = this.additionalOptions["image"];
                } else {
                    this.imageObj.src = this.dxCanvas.getDxCanvasRoot() + this.additionalOptions["image"];
                    this.imageObj.setAttribute('crossorigin', 'anonymous');
                }
            } else {
                context.save();
                context.drawImage(this.imageObj, imgCoords.x, imgCoords.y, width / 2, height / 2);
                context.restore();
            }
        }
    }
}

/**
 * The DivbloxBaseRectangleCanvasObject is basically a rectangle that is filled with a specified colour, has an optional
 * image or text in its center and also has an optional notification indicator at its top right
 *  ____[x]
 * | abcdef |
 * ---------
 */
class DivbloxBaseRectangleCanvasObject extends DivbloxBaseCanvasObject {
    /**
     * Initializes the relevant data for the object
     * @param {*} dxCanvas The instance of the DivbloxCanvas object that controls the canvas
     * @param {{x: number, y: number}} drawStartCoords The x and y coordinates where this object is drawn from
     * @param additionalOptions Options specific to this object and how it is drawn and handled on the canvas
     * @param {string} additionalOptions.uid An optional, user-specified unique identifier for this object. Used to
     * link objects to each other
     * @param {boolean} additionalOptions.isDraggable If true, this object is draggable on the canvas
     * @param {string} additionalOptions.fillColour A HEX value representing the fill colour for the object
     * @param {{width:number,height:number}} additionalOptions.dimensions {} An object containing the dimensions of
     * this canvas object
     * @param {string} additionalOptions.text {} Optional. The text that should be displayed in the
     * center of the rectangle
     * @param {string} additionalOptions.textColour {} Optional. A HEX value representing the colour of the text
     * to display
     * @param {string} additionalOptions.image {} Optional. The path to the image that should be displayed in the
     * center of the rectangle
     * @param {number} additionalOptions.notificationCount {} Optional. A number to display in a notification
     * bubble at the top right of the rectangle
     * @param {string} additionalOptions.notificationBubbleColour A HEX value representing the fill colour for
     * the notification bubble
     * @param objectData Optional. An object containing data relevant to the object. This data is not necessarily used
     * on the canvas, but is available to the developer when needed
     * @param {string} canvasId Optional. The id that will be used to detect this object on the canvas
     */
    constructor(dxCanvas = null,
                drawStartCoords = {x: 0, y: 0},
                additionalOptions = {
                    isDraggable: false,
                    fillColour: "#000000",
                    dimensions:
                        {width: 100, height: 100}
                },
                objectData = {},
                canvasId = "-1") {
        super(dxCanvas, drawStartCoords, additionalOptions, objectData, canvasId);
        this.cornerRadius = {topLeft: 10, topRight: 10, bottomRight: 10, bottomLeft: 10};
        // These values are percentages of the smallest side of the rectangle
    }

    /**
     * Initializes the relevant variables for this object
     */
    initializeObject() {
        this.imageObj = null;
        super.initializeObject();
    }

    /**
     * Draws the rectangle on the canvas
     * @param {CanvasRenderingContext2D} context The context object of our canvas
     */
    drawObjectComponents(context = null) {
        if (context === null) {
            throw new Error("No context provided for object");
        }

        // Start drawing the main object
        context.save();
        this.drawShadow(context);
        const borderRadiusDelta = this.width > this.height ? this.height : this.width;
        const relativeRadius = {
            topLeft: borderRadiusDelta * (this.cornerRadius.topLeft / 100),
            topRight: borderRadiusDelta * (this.cornerRadius.topRight / 100),
            bottomRight: borderRadiusDelta * (this.cornerRadius.bottomRight / 100),
            bottomLeft: borderRadiusDelta * (this.cornerRadius.bottomLeft / 100)
        }
        context.beginPath();
        context.moveTo(this.x + relativeRadius.topLeft, this.y);
        context.lineTo(this.x + this.width - relativeRadius.topRight, this.y);
        context.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + relativeRadius.topRight);
        context.lineTo(this.x + this.width, this.y + this.height - relativeRadius.bottomRight);
        context.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - relativeRadius.bottomRight, this.y + this.height);
        context.lineTo(this.x + relativeRadius.bottomLeft, this.y + this.height);
        context.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - relativeRadius.bottomLeft);
        context.lineTo(this.x, this.y + relativeRadius.topLeft);
        context.quadraticCurveTo(this.x, this.y, this.x + relativeRadius.topLeft, this.y);
        context.fillStyle = this.fillColour;
        context.fill();
        context.closePath();
        context.restore();

        // Let's add the provided image (if any) to the center of the rectangle
        if (typeof this.additionalOptions["image"] !== "undefined") {
            const imgCoords = {
                x: this.boundingRectangleCoords.x1 + this.width / 4,
                y: this.boundingRectangleCoords.y1 + this.height / 4
            }
            if (this.imageObj === null) {
                this.imageObj = new Image();
                if (this.additionalOptions["image"].indexOf("http") !== -1) {
                    this.imageObj.src = this.additionalOptions["image"];
                } else {
                    this.imageObj.src = this.dxCanvas.getDxCanvasRoot() + this.additionalOptions["image"];
                    this.imageObj.setAttribute('crossorigin', 'anonymous');
                }
            } else {
                context.save();
                context.drawImage(this.imageObj, imgCoords.x, imgCoords.y, this.width / 2, this.height / 2);
                context.restore();
            }
        }

        // Let's add the provided text (if any) to the center of the rectangle
        if (typeof this.additionalOptions["text"] !== "undefined") {
            const maxFontSize = this.height / 4;
            let fontSize = maxFontSize;
            context.font = "small-caps bold " + fontSize + "px " + this.dxCanvas.baseFontFamily;
            let textWidth = Math.ceil(context.measureText(this.additionalOptions["text"]).width);
            while (textWidth > (this.width * 0.8)) {
                fontSize = fontSize - 0.5;
                context.font = "small-caps bold " + fontSize + "px " + this.dxCanvas.baseFontFamily;
                textWidth = Math.ceil(context.measureText(this.additionalOptions["text"]).width);
            }
            const textCoords = {x: this.x + (this.width / 2), y: this.y + (this.height / 2) + (fontSize / 4)};
            context.save();
            context.fillStyle = '#000';
            if (typeof this.additionalOptions["textColour"] !== "undefined") {
                context.fillStyle = this.additionalOptions["textColour"];
            }
            context.textAlign = 'center';
            context.fillText(this.additionalOptions["text"], textCoords.x, textCoords.y);
            context.restore();
        }
    }
}

/**
 * The DivbloxBaseTemporaryCircleCanvasObject is used for temporary canvas objects like arrow makers, navigators, and object controllers. This class helps to process interactions with the specific temporary objects.
 */
class DivbloxBaseTemporaryCircleCanvasObject extends DivbloxBaseCanvasObject {
    /**
     * Initializes the relevant data for the object
     * @param {DivbloxCanvas} dxCanvas The instance of the DivbloxCanvas object that controls the canvas
     * @param {{x: number, y: number}} drawStartCoords The x and y coordinates where this object is drawn from
     * @param additionalOptions Options specific to this object and how it is drawn and handled on the canvas
     * @param {string} additionalOptions.uid An optional, user-specified unique identifier for this object. Used to link objects to each other
     * @param {boolean} additionalOptions.isDraggable If true, this object is draggable on the canvas
     * @param {string} additionalOptions.fillColour A HEX value representing the fill colour for the object
     * @param {{width:number,height:number}} additionalOptions.dimensions {} An object containing the dimensions of this canvas object
     * @param {string} additionalOptions.text {} Optional. The text that should be displayed in the center of the rectangle
     * @param {string} additionalOptions.textColour {} Optional. A HEX value representing the colour of the text to display
     * @param {string} additionalOptions.image {} Optional. The path to the image that should be displayed in the center of the rectangle
     * @param {number} additionalOptions.notificationCount {} Optional. A number to display in a notification bubble at the top right of the rectangle
     * @param {string} additionalOptions.notificationBubbleColour A HEX value representing the fill colour for the notification bubble
     * @param objectData Optional. An object containing data relevant to the object. This data is not necessarily used on the canvas, but is available to the developer when needed
     * @param {string} canvasId Optional. The id that will be used to detect this object on the canvas
     * @param {boolean} temporaryCanvasObject
     */
    constructor(dxCanvas = null,
                drawStartCoords = {x: 0, y: 0},
                additionalOptions =
                    {
                        isDraggable: true,
                        fillColour: "#b1caf2",
                        dimensions:
                            {radius: 2}
                    },
                objectData = {},
                canvasId = -1,
                temporaryCanvasObject = true) {
        super(dxCanvas, drawStartCoords, additionalOptions, objectData, canvasId, temporaryCanvasObject);
    }

    /**
     * Initializes the relevant variables for this object
     */
    initializeObject() {
        this.imageObj = null;
        this.radius = 10;
        if (typeof this.additionalOptions["dimensions"] !== "undefined") {
            if (typeof this.additionalOptions["dimensions"]["radius"] !== "undefined") {
                this.radius = this.additionalOptions["dimensions"]["radius"];
            }
        }
        super.initializeObject();
    }

    /**
     * Updates the bounding coordinates for the object based on the circle's radius
     */
    updateBoundingCoords() {
        this.boundingRectangleCoords =
            {
                x1: this.x - this.radius,
                y1: this.y - this.radius,
                x2: this.x + this.radius,
                y2: this.y + this.radius
            };
    }

    /**
     * Draws the circle on the canvas
     * @param {CanvasRenderingContext2D} context The context object of our canvas
     */
    drawObjectComponents(context = null) {
        if (context === null) {
            throw new Error("No context provided for object");
        }
        // Start drawing the main object
        context.save();
        if (this.additionalOptions.drawShadow) {
            this.drawShadow(context);
        }

        context.beginPath();
        context.moveTo(this.x, this.y);
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
        context.fillStyle = this.fillColour;
        context.fill();
        context.restore();

        // Let's add the provided image (if any) to the center of the circle
        if (typeof this.additionalOptions["image"] !== "undefined") {
            const width = this.boundingRectangleCoords.x2 - this.boundingRectangleCoords.x1;
            const height = this.boundingRectangleCoords.y2 - this.boundingRectangleCoords.y1;
            const imgCoords = {
                x: this.boundingRectangleCoords.x1 + width / 4,
                y: this.boundingRectangleCoords.y1 + height / 4
            }
            if (this.imageObj === null) {
                this.imageObj = new Image();
                if (this.additionalOptions["image"].indexOf("http") !== -1) {
                    this.imageObj.src = getAssetsPath('../') + this.additionalOptions["image"];
                } else {
                    this.imageObj.src = this.dxCanvas.getDxCanvasRoot() + this.additionalOptions["image"];
                    this.imageObj.setAttribute('crossorigin', 'anonymous');
                }
            } else {
                context.save();
                context.drawImage(this.imageObj, imgCoords.x, imgCoords.y, width / 2, height / 2);
                context.restore();
            }
        }
    }

    /**
     * We have introduced different types of temporary objects into the system, this function essentially makes sure the correct processing is applied to the different types of temporary objects.
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class. It is passed as the whole canvas needs to be updated after changes
     * @summary This functions handles the on click event for this object
     * */
    onClick(dxCanvasObj) {
        switch (true) {
            case this.uid.includes('temp_arrow'):
                this.tempArrowClickEventHandler(dxCanvasObj);
                break;
            case this.uid.includes('temp_delete'):
                this.tempDeleteClickEventHandler(dxCanvasObj);
                break;
        }

    }

    /**
     * Firstly we need to decide where we will place the temporary navigator object. Currently, it is hardcoded to place 50px in the direction of the arrow clicked. It will create a temporary navigator object and link the non-temporary object of interest to this navigator temporary object - so we have a dynamic link.
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class. It is passed as the whole canvas needs to be updated after changes
     * @summary This function is called when a link creator arrow is clicked
     */
    tempArrowClickEventHandler(dxCanvasObj) {
        let distanceFromParentObj = 50;

        const currentObjectCoords = this.getBoundingRectangle();

        let navigatorObjectCoords = {
            x: (currentObjectCoords.x2 - currentObjectCoords.x1)/2 + currentObjectCoords.x1,
            y: (currentObjectCoords.y2 - currentObjectCoords.y1)/2 + currentObjectCoords.y1
        }

        switch (true) {
            case this.uid.includes("up"):
                navigatorObjectCoords.y = navigatorObjectCoords.y - distanceFromParentObj;
                break;
            case this.uid.includes("down"):
                navigatorObjectCoords.y = navigatorObjectCoords.y + distanceFromParentObj;
                break;
            case this.uid.includes("left"):
                navigatorObjectCoords.x = navigatorObjectCoords.x - distanceFromParentObj;
                break;
            case this.uid.includes("right"):
                navigatorObjectCoords.x = navigatorObjectCoords.x + distanceFromParentObj;
                break;
        }

        let canvasId = dxCanvasObj.getNewCanvasId();

        const newObject = {
            "type": "DivbloxBaseTemporaryCircleCanvasObject",
            "x": navigatorObjectCoords.x,
            "y": navigatorObjectCoords.y,
            "additionalOptions": {
                "drawShadow": false,
                "uid": "temp_link_navigator_" + canvasId,
                "isDraggable": true,
                "fillColour": 'rgba(0,0,0,0)',
                "dimensions": {
                    "radius": 6
                },
                "linkFrom": this.additionalOptions.linkFrom
            },
            "data": {}
        }

        let parentCanvasObj = dxCanvasObj.getObjectByUid(this.additionalOptions.linkFrom);

        if (!parentCanvasObj.additionalOptions.hasOwnProperty("connections")) {
            parentCanvasObj.additionalOptions.connections = [];
        }

        parentCanvasObj.additionalOptions.connections.push(newObject.additionalOptions.uid);

        dxCanvasObj.registerObject(dxCanvasObj.initObjectFromJson(newObject));
        window.requestAnimationFrame(dxCanvasObj.update.bind(dxCanvasObj));
    }

    /**
     * When we want to delete an object from the canvas, we need remove all the temporary objects linked to it (see the removeRelatedTemporaryObjects function). After that we need to clear connection to the current object in objects that are not being removed. Only after this can we go through the process of removing the object from the DivbloxCanvas object (see DivbloxCanvas::deleteObject)
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class. It is passed as the whole canvas needs to be updated after changes
     * @summary This function is called when a temporary delete object is clicked.
     */
    tempDeleteClickEventHandler(dxCanvasObj) {
        let text = "Are you sure you want to delete this object and all related connections?";
        if (confirm(text) == false) {
            return;
        }

        this.removeRelatedTemporaryObjects(dxCanvasObj);
        if (!this.additionalOptions.hasOwnProperty("linkFrom")) {
            return;
        }
        let parentObject = dxCanvasObj.getObjectByUid(this.additionalOptions.linkFrom);
        if (parentObject === null) {
            return;
        }

        setTimeout(function() {
            dxCanvasObj.removeLinksToObject(parentObject);
            dxCanvasObj.deleteObject(parentObject);

            window.requestAnimationFrame(dxCanvasObj.update.bind(dxCanvasObj));
        }.bind(this), 20);
    }

    /**
     * This function will add link creator arrows around the current object. These link creators can be clicked to create object linking arrows.
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class. It is passed as the whole canvas needs to be updated after changes
     * @summary This function is called when a non-temporary object is set to active
     */
    drawTempArrowHeads(dxCanvasObj) {
        switch (true) {
            case this.uid.includes('temp_link_navigator'):
                return;
            default:
                super.drawTempArrowHeads(dxCanvasObj)
                break;
        }
    }

    /**
     * Currently we only observe hovering events for the navigator temporary objects on the canvas and react accordingly. This means the object needs to have "temp_link_navigator" as part of the uid to be effected.
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class. It is passed as the whole canvas needs to be updated after changes
     * @summary This function handles the on mouse enter for this object
     */
    onMouseEnter(dxCanvasObj) {
        this.inHoverState = true;
        switch (true) {
            case this.uid.includes('temp_link_navigator'):
                this.fillColour = "rgb(0, 0, 0, 0.5)";
                window.requestAnimationFrame(dxCanvasObj.update.bind(dxCanvasObj));
                break;
        }

        if (this.dxCanvas.isDebugModeActive === true) {
            console.log("Object " + this.getId() + " mouse entered");
        }
    }

    /**
     * Currently this function is only used to alter the background of the temporary navigator objects but is a good basis for other uses when hovering is the trigger
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class. It is passed as the whole canvas needs to be updated after changes
     * @summary This function handles the on mouse leave for this object
     */
    onMouseLeave(dxCanvasObj) {
        this.inHoverState = false;

        switch (true) {
            case this.uid.includes('temp_link_navigator'):
                this.fillColour = "rgb(0, 0, 0, 0)";
                window.requestAnimationFrame(dxCanvasObj.update.bind(dxCanvasObj));
                break;
        }

        if (this.dxCanvas.isDebugModeActive === true) {
            console.log("Object " + this.getId() + " mouse left");
        }
    }

    /**
     * Currently this function is only used in the case where a navigator temporary object is dropped on a non-temporary object. This function will not execute any functionality if the object's uid does not contain "temp_link_navigator"
     * @param {MouseEvent} event this object passed from javascript from end through the DivbloxCanvas class object
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class
     * @summary This is a function that will be called when an object is dropped after being dragged
     */
    objectDropped(event, dxCanvasObj) {
        switch (true) {
            case this.uid.includes('temp_link_navigator'):
                this.onNavigatorDroppedEventHandler(event, dxCanvasObj);
                break;
        }
    }

    /**
     * This function is triggered when the navigator of a temporary link is dropped. If it is dropped on a non-temporary object, a link will be created between the parent object, indicated by the "linkFrom" attribute in the navigator, and the object on which the navigator was dropped on.
     * @param {MouseEvent} event this object passed from javascript from end through the DivbloxCanvas class object
     * @param {DivbloxCanvas} dxCanvasObj this is an instance on the DivbloxCanvas class
     */
    onNavigatorDroppedEventHandler(event, dxCanvasObj) {
        let droppedOnObject = dxCanvasObj.getObjectByCoordinates(event);
        if (droppedOnObject === null) {
            return;
        }

        let parentCanvasObject = dxCanvasObj.getObjectByUid(this.additionalOptions.linkFrom);
        if (!parentCanvasObject) return;

        parentCanvasObject.additionalOptions.connections.push(droppedOnObject.uid);
        let parentConnectionsIndex = parentCanvasObject.additionalOptions.connections.indexOf(this.uid);
        parentCanvasObject.additionalOptions.connections.splice(parentConnectionsIndex, 1);

        dxCanvasObj.deleteObject(this);
        window.requestAnimationFrame(dxCanvasObj.update.bind(dxCanvasObj));
    }
}

/**
 * The DivbloxBaseHtmlCanvasObject attempts to display an interactive HTML section, contained inside a <div> element as
 * an overlay on the canvas
 */
class DivbloxBaseHtmlCanvasObject extends DivbloxBaseCanvasObject {
    /**
     * Initializes the relevant data for the object
     * @param {*} dxCanvas The instance of the DivbloxCanvas object that controls the canvas
     * @param {{x: number, y: number}} drawStartCoords The x and y coordinates where this object is drawn from
     * @param additionalOptions Options specific to this object and how it is drawn and handled on the canvas
     * @param {string} additionalOptions.uid An optional, user-specified unique identifier for this object. Used to
     * link objects to each other
     * @param {boolean} additionalOptions.isDraggable If true, this object is draggable on the canvas
     * @param {string} additionalOptions.fillColour A HEX value representing the fill colour for the object
     * @param {{width:number,height:number}} additionalOptions.dimensions {} An object containing the dimensions of
     * this canvas object
     * @param {{width:number,height:number}} additionalOptions.dimensions.expandedDimensions {} An object
     * containing the dimensions of the object when it is expanded
     * @param {string} additionalOptions.text {} Optional. The text that should be displayed in the
     * center of the rectangle
     * @param {string} additionalOptions.textColour {} Optional. A HEX value representing the colour of the text
     * to display
     * @param {string} additionalOptions.image {} Optional. The path to the image that should be displayed in the
     * center of the rectangle
     * @param {number} additionalOptions.notificationCount {} Optional. A number to display in a notification
     * bubble at the top right of the rectangle
     * @param {string} additionalOptions.notificationBubbleColour A HEX value representing the fill colour for
     * the notification bubble
     * @param {string} additionalOptions.htmlContentElementId The element id of the html div containing our list
     * data that should be displayed when expanded
     * @param {boolean} additionalOptions.startExpanded Optional. If set to true, the object will render as
     * expanded from the start
     * @param {boolean} additionalOptions.preventCollapse Optional. If set to true, the object will not have a
     * collapse toggle and cannot be collapsed
     * @param objectData Optional. An object containing data relevant to the object. This data is not necessarily used
     * on the canvas, but is available to the developer when needed
     * @param {number} canvasId Optional. The id that will be used to detect this object on the canvas
     */
    constructor(dxCanvas = null,
                drawStartCoords = {x: 0, y: 0},
                additionalOptions = {
                    isDraggable: false,
                    fillColour: "#000000",
                    dimensions: {
                        width: 100,
                        height: 100,
                        expandedDimensions: {
                            width: 200,
                            height: 200
                        }
                    }
                },
                objectData = {},
                canvasId = -1) {
        super(dxCanvas, drawStartCoords, additionalOptions, objectData, canvasId);
        this.cornerRadius = {topLeft: 10, topRight: 10, bottomRight: 10, bottomLeft: 10};
        // These values are percentages of the smallest side of the rectangle
    }

    /**
     * Initializes the relevant variables for this object
     */
    initializeObject() {
        this.imageObj = null
        this.isExpanded = false;
        this.preventCollapse = false;
        this.expandToggleIconImageObj = null;
        this.collapseToggleIconImageObj = null;
        this.expandedWidth = 0;
        this.expandedHeight = 0;
        this.contentPadding = 5;
        this.lineWidth = 4;
        if (typeof this.additionalOptions["htmlContentElementId"] === "undefined") {
            throw new Error("No content div provided for data list");
        }
        this.contentHtmlElement = document.getElementById(this.additionalOptions["htmlContentElementId"]);
        if (typeof this.contentHtmlElement === "undefined") {
            throw new Error("Invalid content div provided for data list");
        }
        this.contentHtmlElement.style.display = "none";
        this.contentHtmlElement.style.position = "absolute";
        this.contentHtmlElement.style.background = "#fff";
        this.contentHtmlElement.style.overflow = "scroll";
        this.contentHtmlElement.style.padding = this.contentPadding + "px";

        this.expandedWidthReference = 0;
        this.expandedHeightReference = 0;
        this.relativeRadius = {
            topLeft: 0,
            topRight: 0,
            bottomRight: 0,
            bottomLeft: 0
        }

        if (typeof this.additionalOptions["startExpanded"] !== "undefined") {
            this.isExpanded = this.additionalOptions["startExpanded"];
        }
        if (typeof this.additionalOptions["preventCollapse"] !== "undefined") {
            this.preventCollapse = this.additionalOptions["preventCollapse"];
        }

        this.placeholderText = "";
        if (typeof this.additionalOptions["placeholderText"] !== "undefined") {
            this.placeholderText = this.additionalOptions["placeholderText"];
        }
        super.initializeObject();

        if ((typeof this.additionalOptions["dimensions"]["expandedDimensions"] !== "undefined") &&
            (typeof this.additionalOptions["dimensions"]["expandedDimensions"]["width"] !== "undefined") &&
            (typeof this.additionalOptions["dimensions"]["expandedDimensions"]["height"] !== "undefined")) {
            this.expandedWidthReference = this.additionalOptions["dimensions"]["expandedDimensions"]["width"] - this.width;
            this.expandedHeightReference = this.additionalOptions["dimensions"]["expandedDimensions"]["height"];
        }

        this.toggleExpandedContent();
    }

    /**
     * Helper function for this object that calculates the bounding coordinates
     */
    doBoundingCoordsCalculation() {
        this.boundingRectangleCoords = {
            x1: this.x,
            y1: this.y,
            x2: this.x + this.width, // The current x2 point, including expansion
            x3: this.x + this.width - this.expandedWidth, // The original x2 point without expansion
            y2: this.y + this.height + this.expandedHeight, // The current y2 point, including expansion
            y3: this.y + this.height
        };// The original y2 point without expansion
    }

    /**
     * Updates the bounding coordinates for the object. Useful when the canvas is transformed to ensure that the
     * object is displayed correctly
     */
    updateBoundingCoords() {
        this.doBoundingCoordsCalculation();
        if (this.isExpanded === true) {
            if (this.validateExpansionAllowed()) {
                this.contentHtmlElement.style.display = "block";
            } else {
                this.contentHtmlElement.style.display = "none";
            }
        }

        const screenCoords = this.getScreenCoordinates(this.dxCanvas.getContext());
        const screenWidth = screenCoords.x2 - screenCoords.x1 - (2 * this.contentPadding) - (2 * this.lineWidth);
        const screenHeight = screenCoords.y2 - screenCoords.y3 - (2 * this.contentPadding) - (2 * this.lineWidth);

        const transform = this.dxCanvas.context.getTransform();

        this.contentHtmlElement.style.width = screenWidth + "px";
        this.contentHtmlElement.style.height = screenHeight + "px";
        this.contentHtmlElement.style.left = (screenCoords.x1 + this.lineWidth + this.contentPadding + dxHelpers.getWindowScrollPosition().x) + "px";
        this.contentHtmlElement.style.top = (screenCoords.y3 + this.lineWidth + this.contentPadding + dxHelpers.getWindowScrollPosition().y) + "px";
        this.contentHtmlElement.style.borderBottomRightRadius = this.relativeRadius.bottomRight + "px";
        this.contentHtmlElement.style.borderBottomLeftRadius = this.relativeRadius.bottomLeft + "px";

        // Once the content is scaled too tiny, we just want to hide the html content
        if ((transform.a < 0.25) || (transform.d < 0.25)) {
            this.contentHtmlElement.style.display = "none";
        }
    }

    /**
     * Returns the actual screen coordinates for this object
     * @param {CanvasRenderingContext2D} context The context object of our canvas
     * @return {{y1: number, x1: number, y2: number, x2: number}}
     */
    getScreenCoordinates(context = null) {
        const rect = this.dxCanvas.canvas.getBoundingClientRect();
        const transform = context.getTransform();
        const rectTransformed = {
            left: (rect.left + transform.e) / transform.a,
            top: (rect.top + transform.f) / transform.d,
            right: (rect.left + this.dxCanvas.canvas.width + transform.e) / transform.a,
            bottom: (rect.top + this.dxCanvas.canvas.height + transform.f) / transform.d,
        };
        return {
            x1: transform.a * (this.boundingRectangleCoords.x1 + rectTransformed.left),
            y1: transform.d * (this.boundingRectangleCoords.y1 + rectTransformed.top),
            x2: transform.a * (this.boundingRectangleCoords.x2 + rectTransformed.left),
            y2: transform.d * (this.boundingRectangleCoords.y2 + rectTransformed.top),
            y3: transform.d * (this.boundingRectangleCoords.y3 + rectTransformed.top),
        };
    }

    /**
     * Draws the object while taking the current state of expansion into account
     * @param {CanvasRenderingContext2D} context The context object of our canvas
     */
    drawObject(context = null) {
        if (this.isExpanded === true) {
            this.updateBoundingCoords();
        }
        super.drawObject(context);
        this.drawExpandToggleIcon(context);
    }

    /**
     * Draws the rectangle on the canvas
     * @param {CanvasRenderingContext2D} context The context object of our canvas
     */
    drawObjectComponents(context = null) {
        if (context === null) {
            throw new Error("No context provided for object");
        }

        const borderRadiusDelta = this.width > this.height ? this.height : this.width;
        this.relativeRadius = {
            topLeft: borderRadiusDelta * (this.cornerRadius.topLeft / 100),
            topRight: borderRadiusDelta * (this.cornerRadius.topRight / 100),
            bottomRight: borderRadiusDelta * (this.cornerRadius.bottomRight / 100),
            bottomLeft: borderRadiusDelta * (this.cornerRadius.bottomLeft / 100)
        }
        context.save();
        context.lineWidth = this.lineWidth;
        this.drawShadow(context);
        if (this.isExpanded === true) {
            context.beginPath();
            context.moveTo(this.x + this.relativeRadius.topLeft, this.y);
            context.lineTo(this.x + this.width - this.relativeRadius.topRight, this.y);
            context.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + this.relativeRadius.topRight);
            context.lineTo(this.x + this.width, this.y + this.height);
            context.lineTo(this.x, this.y + this.height);
            context.lineTo(this.x, this.y + this.relativeRadius.topLeft);
            context.quadraticCurveTo(this.x, this.y, this.x + this.relativeRadius.topLeft, this.y);
            context.fillStyle = this.fillColour;
            context.fill();
            context.closePath();

            let coordsWithLinedWidth = {
                x1: this.x + (this.lineWidth / 2),
                y1: this.y + this.height,
                x2: this.x + this.width - (this.lineWidth / 2),
                y2: this.y + this.height + this.expandedHeight
            };

            // Draw the outline of the expanded area
            context.beginPath();
            context.moveTo(coordsWithLinedWidth.x2, coordsWithLinedWidth.y1);
            context.lineTo(coordsWithLinedWidth.x2, coordsWithLinedWidth.y2 - this.relativeRadius.bottomRight);
            context.quadraticCurveTo(
                coordsWithLinedWidth.x2,
                coordsWithLinedWidth.y2,
                coordsWithLinedWidth.x2 - this.relativeRadius.bottomRight,
                coordsWithLinedWidth.y2);
            context.lineTo(coordsWithLinedWidth.x1 + this.relativeRadius.bottomLeft,
                coordsWithLinedWidth.y2);
            context.quadraticCurveTo(
                coordsWithLinedWidth.x1,
                coordsWithLinedWidth.y2,
                coordsWithLinedWidth.x1,
                coordsWithLinedWidth.y2 - this.relativeRadius.bottomLeft);
            context.lineTo(coordsWithLinedWidth.x1, coordsWithLinedWidth.y1);
            context.strokeStyle = this.fillColour;
            context.stroke();
            context.closePath();

            // Fill the expanded area. We do this separately because we want to retain our line width
            coordsWithLinedWidth = {
                x1: this.x + this.lineWidth,
                y1: this.y + this.height,
                x2: this.x + this.width - this.lineWidth,
                y2: this.y + this.height + this.expandedHeight - (this.lineWidth / 2)
            };
            context.beginPath();
            context.moveTo(coordsWithLinedWidth.x2, coordsWithLinedWidth.y1);
            context.lineTo(coordsWithLinedWidth.x2, coordsWithLinedWidth.y2 - this.relativeRadius.bottomRight);
            context.quadraticCurveTo(
                coordsWithLinedWidth.x2,
                coordsWithLinedWidth.y2,
                coordsWithLinedWidth.x2 - this.relativeRadius.bottomRight,
                coordsWithLinedWidth.y2);
            context.lineTo(coordsWithLinedWidth.x1 + this.relativeRadius.bottomLeft,
                coordsWithLinedWidth.y2);
            context.quadraticCurveTo(
                coordsWithLinedWidth.x1,
                coordsWithLinedWidth.y2,
                coordsWithLinedWidth.x1,
                coordsWithLinedWidth.y2 - this.relativeRadius.bottomLeft);
            context.lineTo(coordsWithLinedWidth.x1, coordsWithLinedWidth.y1);
            context.fillStyle = "#ffffff";
            context.fill()
            context.closePath();

            // Write the placeholder text that is shown when the html content cannot be viewed
            const fontHeight = (coordsWithLinedWidth.y2 - coordsWithLinedWidth.y1) * 0.1; //10% Of the height
            context.font = fontHeight + "px " + this.dxCanvas.baseFontFamily;
            context.fillStyle = "#000000C1";
            context.textAlign = "center";
            const centerCoords = {
                x: coordsWithLinedWidth.x1 + (coordsWithLinedWidth.x2 - coordsWithLinedWidth.x1) / 2,
                y: coordsWithLinedWidth.y1 + (coordsWithLinedWidth.y2 - coordsWithLinedWidth.y1) / 2
            };
            context.fillText(this.placeholderText, centerCoords.x, centerCoords.y);
        } else {
            context.beginPath();
            context.moveTo(this.x + this.relativeRadius.topLeft, this.y);
            context.lineTo(this.x + this.width - this.relativeRadius.topRight, this.y);
            context.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + this.relativeRadius.topRight);
            context.lineTo(this.x + this.width, this.y + this.height - this.relativeRadius.bottomRight);
            context.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - this.relativeRadius.bottomRight, this.y + this.height);
            context.lineTo(this.x + this.relativeRadius.bottomLeft, this.y + this.height);
            context.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - this.relativeRadius.bottomLeft);
            context.lineTo(this.x, this.y + this.relativeRadius.topLeft);
            context.quadraticCurveTo(this.x, this.y, this.x + this.relativeRadius.topLeft, this.y);
            context.fillStyle = this.fillColour;
            context.fill();
            context.closePath();
        }
        context.restore();

        // Let's add the provided image (if any) to the center of the rectangle
        if (typeof this.additionalOptions["image"] !== "undefined") {
            const imgCoords = {
                x: this.boundingRectangleCoords.x1 + this.width / 4,
                y: this.boundingRectangleCoords.y1 + this.height / 4
            };
            if (this.imageObj === null) {
                this.imageObj = new Image();
                if (this.additionalOptions["image"].indexOf("http") !== -1) {
                    this.imageObj.src = this.additionalOptions["image"];
                } else {
                    this.imageObj.src = this.dxCanvas.getDxCanvasRoot() + this.additionalOptions["image"];
                    this.imageObj.setAttribute('crossorigin', 'anonymous');
                }
            } else {
                context.save();
                context.drawImage(this.imageObj, imgCoords.x, imgCoords.y, this.width / 2, this.height / 2);
                context.restore();
            }
        }

        // Let's add the provided text (if any) to the center of the rectangle
        if (typeof this.additionalOptions["text"] !== "undefined") {
            context.save();
            const maxFontSize = this.height / 4;
            let fontSize = maxFontSize;
            context.font = "small-caps bold " + fontSize + "px " + this.dxCanvas.baseFontFamily;
            let textWidth = Math.ceil(context.measureText(this.additionalOptions["text"]).width);
            while (textWidth > (this.width * 0.8)) {
                fontSize = fontSize - 0.5;
                context.font = "small-caps bold " + fontSize + "px " + this.dxCanvas.baseFontFamily;
                textWidth = Math.ceil(context.measureText(this.additionalOptions["text"]).width);
            }
            const textCoords = {x: this.x + (this.width / 2), y: this.y + (this.height / 2) + (fontSize / 4)};
            context.fillStyle = '#000';
            if (typeof this.additionalOptions["textColour"] !== "undefined") {
                context.fillStyle = this.additionalOptions["textColour"];
            }
            context.textAlign = 'center';
            context.fillText(this.additionalOptions["text"], textCoords.x, textCoords.y);
            context.restore();
        }

    }

    /**
     * Draws the icon that indicates whether the component is expanded or collapsed
     * @param {CanvasRenderingContext2D} context
     */
    drawExpandToggleIcon(context = null) {
        if (this.preventCollapse === true) {
            return;
        }
        if (context === null) {
            throw new Error("No context provided for object");
        }
        const iconHeight = this.height < this.width ? this.height / 4 : this.width / 4;
        const iconWidth = iconHeight;
        const imgCoords = {
            x: this.boundingRectangleCoords.x2 - (iconWidth * 2),
            y: this.boundingRectangleCoords.y1 + this.height / 2 - (iconHeight / 2)
        }
        if ((this.expandToggleIconImageObj === null) || (this.collapseToggleIconImageObj === null)) {
            this.expandToggleIconImageObj = new Image();
            this.expandToggleIconImageObj.src = this.dxCanvas.getDxCanvasRoot() + "assets/images/chevron-arrow-down.png";

            this.collapseToggleIconImageObj = new Image();
            this.collapseToggleIconImageObj.src = this.dxCanvas.getDxCanvasRoot() + "assets/images/chevron-arrow-up.png";

            this.expandToggleIconImageObj.setAttribute('crossorigin', 'anonymous');
            this.collapseToggleIconImageObj.setAttribute('crossorigin', 'anonymous');
        } else if (this.isExpanded === true) {
            context.save();
            context.drawImage(this.collapseToggleIconImageObj, imgCoords.x, imgCoords.y, iconWidth, iconHeight);
            context.restore();
        } else {
            context.save();
            context.drawImage(this.expandToggleIconImageObj, imgCoords.x, imgCoords.y, iconWidth, iconHeight);
            context.restore();
        }
    }

    /**
     * Determines whether to expand or collapse the object
     */
    onClick() {
        super.onClick();

        if (this.preventCollapse === true) {
            return;
        }
        if (this.validateExpansionAllowed() === true) {
            this.isExpanded = !this.isExpanded;
        }
        this.toggleExpandedContent();
        this.updateBoundingCoords();
    }

    /**
     * Calculates the expanded values, based on what's provided in the object definition
     */
    calculateExpandedDimensions() {
        this.expandedHeight = 0;
        this.expandedWidth = 0;
        if ((typeof this.additionalOptions["dimensions"] !== "undefined") &&
            (this.additionalOptions["dimensions"]["width"] !== "undefined")) {
            this.width = this.additionalOptions["dimensions"]["width"];
        }
        if (this.isExpanded === true) {
            this.expandedWidth = this.expandedWidthReference;
            this.width = this.additionalOptions["dimensions"]["expandedDimensions"]["width"];
            this.expandedHeight = this.expandedHeightReference;
        }
    }

    /**
     * Shows or hides the relevant expanded content
     */
    toggleExpandedContent() {
        this.calculateExpandedDimensions();
        this.contentHtmlElement.style.display = this.isExpanded === true ? "block" : "none";
        this.updateAffectedCanvasObjects();
    }

    /**
     * Validates whether the object is allowed to be expanded, based on its position on the canvas
     * @return {boolean}
     */
    validateExpansionAllowed() {
        const rect = this.dxCanvas.canvas.getBoundingClientRect();
        const screenCoords = this.getScreenCoordinates(this.dxCanvas.context);
        if ((screenCoords.x1 < rect.left) ||
            (screenCoords.x2 > rect.right) ||
            (screenCoords.y1 < rect.top) ||
            (screenCoords.y2 > rect.bottom)) {
            return false;
        }
        return true
    }

    /**
     * Repositions all canvas objects that will be affected when this object expands or collapses
     */
    updateAffectedCanvasObjects() {
        const compareCoords = {x: this.boundingRectangleCoords.x1, y: this.boundingRectangleCoords.y3};

        for (const objectId of Object.keys(this.dxCanvas.objectList)) {
            const object = this.dxCanvas.objectList[objectId];
            let repositionCoords = {x: object.x, y: object.y};
            if (object.getBoundingRectangle().x2 > compareCoords.x) {
                repositionCoords.x = this.isExpanded === true ?
                    object.x + this.expandedWidthReference :
                    object.x - this.expandedWidthReference;
            }
            if (object.getBoundingRectangle().y1 > compareCoords.y) {
                repositionCoords.y = this.isExpanded === true ?
                    object.y + this.expandedHeightReference :
                    object.y - this.expandedHeightReference;
            }
            object.updateDeltas({x: object.x, y: object.y});
            object.reposition(repositionCoords);
        }
    }
}
//#endregion

//#region Helper functions
const dxHelpers = {
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
     * @param {CanvasRenderingContext2D} context
     * @param x The x coordinate of the arrow's tip
     * @param y The y coordinate of the arrow's tip
     * @param radians The angle of the arrowhead in radians
     * @param arrowLength The length of the arrowhead
     */
    drawArrowhead(context, x, y, radians, arrowLength = 25) {
        context.save();
        context.beginPath();
        context.translate(x, y);
        context.rotate(radians);
        context.moveTo(0, 0);
        context.lineTo(arrowLength / 3, arrowLength);
        context.lineTo(-(arrowLength / 3), arrowLength);
        context.closePath();
        context.restore();
        context.fill();
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

        return {x: x, y: y};
    }
}

/**
 * Responsible for populating objects on the canvas, based on a dataset that does not contain exact coordinates.
 * Specifically, it tries to map "routes" from left to right on the canvas, creating links between objects.
 * An example input json file is provided in the example_3 folder
 * @type {{objectParents: {}, totalHeight: number, getPreparedObject(*=, *=, *=): (null|{preparedObject: {additionalOptions, data: {}, x: number, y: number, type: string}, width: number}), configuration: {}, preparedUids: *[], getObjectChildren(*=): ([]|*[]), prepareCanvasAutoPopulate(*=): [], prepareCanvasRoute(*=): void, dataToPrepare: *[], preparedData: *[], totalWidth: number}}
 */
const dxCanvasAutoPopulate = {
    configuration: {},
    objectParents: {},
    dataToPrepare: [],
    preparedData: [],
    preparedUids: [],
    totalWidth: 0,
    totalHeight: 0,

    /**
     * Initiates all the placeholder variables that will be used to return the prepared data. This ensures no overlap
     * when the object is used multiple times in a single location
     */
    initData() {
        this.configuration = {};
        this.objectParents = {};
        this.dataToPrepare = [];
        this.preparedData = [];
        this.preparedUids = [];
        this.totalWidth = 0;
        this.totalHeight = 0;
    },
    
    /**
     * Takes the input data (An example of which is located in the example_3 folder and prepares the data to be returned
     * to the normal DivbloxCanvas constructor
     * @param {[]} inputData
     * @return {[]} An object that is ready to be passed to the DivbloxCanvas constructor
     */
    prepareCanvasAutoPopulate(inputData = {}) {
        this.initData();
        
        if (typeof inputData["configuration"] === "undefined") {
            throw new Error("No preparation configuration provided");
        }
        this.configuration = inputData["configuration"];
        
        if (typeof this.configuration["routes"] === "undefined") {
            throw new Error("No preparation route configurations provided");
        }
        
        if (typeof inputData["routeObjects"] === "undefined") {
            throw new Error("No preparation routes provided");
        }
        for (const routeObject of inputData["routeObjects"]) {
            this.totalWidth = 0;
            this.dataToPrepare = routeObject["objects"];
            if (typeof routeObject["route"] === "undefined") {
                throw new Error("Incorrect route objects definition. No route id provided");
            }
            if (typeof this.configuration["routes"][routeObject["route"]] === "undefined") {
                throw new Error("Incorrect route configuration provided");
            }
            if (typeof this.configuration["routes"][routeObject["route"]]["horizontalStart"] !== "undefined") {
                this.totalWidth = this.configuration["routes"][routeObject["route"]]["horizontalStart"];
            }
            this.prepareCanvasRoute(routeObject);
        }
        
        return this.preparedData;
    },
    
    /**
     * Processes a specified route that is to be mapped onto the canvas, meaning all of the objects defined, as well as
     * their children, are mapped with auto-generated x & y coordinates
     * @param routeObject
     */
    prepareCanvasRoute(routeObject = {}) {
        let verticalMiddle = 0;
        let verticalSpace = 0;
        const routeId = routeObject["route"];
        
        if (typeof this.configuration["verticalSpace"] !== "undefined") {
            verticalSpace = this.configuration["verticalSpace"];
        }
        
        if ((typeof this.configuration["routes"][routeId] !== "undefined") &&
            (typeof this.configuration["routes"][routeId]["verticalMiddle"] !== "undefined")) {
            verticalMiddle = this.configuration["routes"][routeId]["verticalMiddle"];
        }
        
        if (typeof this.configuration["horizontalSpace"] !== "undefined") {
            this.totalWidth += this.configuration["horizontalSpace"];
        }
        for (const object of this.dataToPrepare) {
            const preparedObjectResult = this.getPreparedObject(
                object,
                this.configuration,
                {
                    x: this.totalWidth,
                    y: verticalMiddle});
            const isProcessed = preparedObjectResult === null;
            if (!isProcessed) {
                this.preparedData.push(preparedObjectResult.preparedObject);
                this.totalWidth += preparedObjectResult.width;
            }
            
            const childObjects = this.getObjectChildren(object);
            if (childObjects.length > 0) {
                if (typeof this.configuration["horizontalSpace"] !== "undefined") {
                    this.totalWidth += this.configuration["horizontalSpace"];
                }
                let maxChildWidth = 0;
                let childYCoordinates = {top:verticalMiddle,bottom:verticalMiddle};
                let currentYPositionTop = true;
                const isOdd = childObjects.length % 2 !== 0;
                let currentChildIndex = 0;
                for (const childObject of childObjects) {
                    currentChildIndex++;
                    let currentY = verticalMiddle;
                    if (isOdd && (currentChildIndex === 1)) {
                        //currentY stays = verticalMiddle
                    } else {
                        if (currentYPositionTop) {
                            childYCoordinates.top -= verticalSpace;
                            currentY = childYCoordinates.top;
                        } else {
                            childYCoordinates.bottom += verticalSpace;
                            currentY = childYCoordinates.bottom;
                        }
                    }
                    
                    currentY = childObjects.length === 1 ? verticalMiddle : currentY;
                    
                    currentYPositionTop = !currentYPositionTop;
                    const preparedObjectResult = this.getPreparedObject(
                        childObject,
                        this.configuration,
                        {
                            x: this.totalWidth,
                            y: currentY});
                    if (preparedObjectResult === null) {
                        continue;
                    }
                    this.preparedData.push(preparedObjectResult.preparedObject);
                    if (preparedObjectResult.width > maxChildWidth) {
                        maxChildWidth = preparedObjectResult.width;
                    }
                }
                this.totalWidth += maxChildWidth;
            }
        
            if ((typeof this.configuration["horizontalSpace"] !== "undefined") && (!isProcessed)) {
                this.totalWidth += this.configuration["horizontalSpace"];
            }
        }
    },
    
    /**
     * Prepares a single object for the DivbloxCanvas with x & y coordinates
     * @param object
     * @param configuration
     * @param coords
     * @return {null|{preparedObject: {additionalOptions, data: {}, x: number, y: number, type: string}, width: number}}
     */
    getPreparedObject(object = {}, configuration = {}, coords = {x:0,y:0}) {
        if (typeof object["type"] === "undefined") {
            throw new Error("Tried to declare an object with no type provided");
        }
        if (typeof object["additionalOptions"] === "undefined") {
            throw new Error("Tried to declare an object with no options provided");
        }
        if (typeof object["additionalOptions"]["uid"] === "undefined") {
            throw new Error("Tried to declare an object with no uid provided");
        }
        if (this.preparedUids.includes(object["additionalOptions"]["uid"])) {
            return null;
        }
        this.preparedUids.push(object["additionalOptions"]["uid"]);
        let preparedObject = {
            "type": "DivbloxBaseCanvasObject",
            "x": coords.x,
            "y": coords.y,
            "additionalOptions": object["additionalOptions"],
            "data": {}
        };
        let objectTypeFinal = object.type;
    
        if (typeof configuration[objectTypeFinal] !== "undefined") {
            if (typeof configuration[objectTypeFinal]["type"] === "undefined") {
                throw new Error("Tried to declare an object with unknown type '"+objectTypeFinal+"'");
            }
            const preSetType = objectTypeFinal;
            objectTypeFinal = configuration[objectTypeFinal]["type"];
        
            if (typeof configuration[preSetType]["additionalOptions"] !== "undefined") {
                for (const additionalOption of Object.keys(configuration[preSetType]["additionalOptions"])) {
                    preparedObject.additionalOptions[additionalOption] = configuration[preSetType]["additionalOptions"][additionalOption];
                }
            }
        }
    
        preparedObject.type = objectTypeFinal;
    
        if (typeof preparedObject.additionalOptions["dimensions"] === "undefined") {
            throw new Error("Tried to declare an object with no dimensions provided");
        }
        let objectWidth = 0;
        if (typeof preparedObject.additionalOptions["dimensions"]["radius"] !== "undefined") {
            // This is a circle object
            objectWidth = 2 * preparedObject.additionalOptions["dimensions"]["radius"]
        } else if (typeof preparedObject.additionalOptions["dimensions"]["width"] !== "undefined") {
            // This is not a circle object
            objectWidth = preparedObject.additionalOptions["dimensions"]["width"];
        }
        return {"preparedObject":preparedObject,"width":objectWidth};
    },
    
    /**
     * Returns all the children of a given object. These will be connections on the DivbloxCanvas
     * @param object
     * @return {*[]}
     */
    getObjectChildren(object = {}) {
        if (typeof object["additionalOptions"] === "undefined") {
            throw new Error("Tried to declare an object with no options provided");
        }
        if (typeof object["additionalOptions"]["connections"] === "undefined") {
            return [];
        }
        let childObjects = [];
        for (const childUid of object["additionalOptions"]["connections"]) {
            for (const globalObject of this.dataToPrepare) {
                if (typeof globalObject["additionalOptions"]["uid"] === "undefined") {
                    throw new Error("Tried to declare an object with no uid provided");
                }
                if (globalObject.additionalOptions.uid === childUid) {
                    childObjects.push(globalObject);
                }
                if (childObjects.length === object["additionalOptions"]["connections"].length) {
                    return childObjects;
                }
            }
        }
        return childObjects;
    }
}
//#endregion
