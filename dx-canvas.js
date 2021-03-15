const dx_canvas = {
    canvas_obj: null,
    context_obj: null,
    is_mouse_down: false,
    initCanvas(element_id) {
        this.canvas_obj = document.getElementById(element_id);
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
        return this.getContext();
    },
    setContext() {
        if (this.canvas_obj === null) {
            throw new Error("Canvas not initialized");
        }
        this.context_obj =  this.canvas_obj.getContext('2d');
    },
    getContext() {
        this.setContext();
        return this.context_obj;
    },
    validateEvent(event_obj = null) {
        if (event_obj === null) {
            throw new Error("Invalid event provided");
        }
        if (this.canvas_obj === null) {
            throw new Error("Canvas not initialized");
        }
    },
    getMousePosition(event_obj = null) {
        this.validateEvent(event_obj);
        const rect = this.canvas_obj.getBoundingClientRect();
        return {
            x: event_obj.clientX - rect.left,
            y: event_obj.clientY - rect.top
        };
    },
    onMouseMove(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        if (this.is_mouse_down) {
            this.testFunction('Mouse drag position: ' + mousePos.x + ',' + mousePos.y);
        } else {
            this.testFunction('Mouse moved position: ' + mousePos.x + ',' + mousePos.y);
        }

    },
    onMouseEnter(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse entered at: "+JSON.stringify(mousePos));
    },
    onMouseLeave(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse leave at: "+JSON.stringify(mousePos));
    },
    onMouseOver(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse over at: "+JSON.stringify(mousePos));
    },
    onMouseOut(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse out at: "+JSON.stringify(mousePos));
    },
    onMouseDown(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        this.is_mouse_down = true;
        this.testFunction('Mouse down position: ' + mousePos.x + ', ' + mousePos.y);
    },
    onMouseUp(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        this.is_mouse_down = false;
        this.testFunction('Mouse up position: ' + mousePos.x + ', ' + mousePos.y);
    },
    onMouseClick(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse clicked at: "+JSON.stringify(mousePos));
    },
    onMouseDoubleClick(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse double clicked at: "+JSON.stringify(mousePos));
    },
    onMouseRightClick(event_obj = null) {
        this.validateEvent(event_obj);
        const mousePos = this.getMousePosition(event_obj);
        console.log("Mouse right clicked at: "+JSON.stringify(mousePos));
    },
    testFunction(message) {
        const context = this.getContext();
        context.clearRect(0, 0, this.canvas_obj.width, this.canvas_obj.height);
        context.font = '18pt Calibri';
        context.fillStyle = 'black';
        context.fillText(message, 10, this.canvas_obj.height / 2);
    }
}