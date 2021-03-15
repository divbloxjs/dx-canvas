const dx_canvas = {
    canvas_obj: null,
    context_obj: null,
    initCanvas(element_id) {
        this.canvas_obj = document.getElementById(element_id);
        this.context_obj = this.getContext();
        this.canvas_obj.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        this.canvas_obj.addEventListener('mousedown', this.onMouseDown.bind(this), false);
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
    getMousePosition(event_obj = null) {
        if (event_obj === null) {
            throw new Error("Invalid event provided");
        }
        if (this.canvas_obj === null) {
            throw new Error("Canvas not initialized");
        }
        const rect = this.canvas_obj.getBoundingClientRect();
        return {
            x: event_obj.clientX - rect.left,
            y: event_obj.clientY - rect.top
        };
    },
    onMouseMove(event_obj = null) {
        if (event_obj === null) {
            throw new Error("Invalid event provided");
        }
        if (this.canvas_obj === null) {
            throw new Error("Canvas not initialized");
        }
        const mousePos = this.getMousePosition(event_obj);
        this.testFunction('Mouse moved position: ' + mousePos.x + ',' + mousePos.y);
    },
    onMouseDown(event_obj = null) {
        if (event_obj === null) {
            throw new Error("Invalid event provided");
        }
        if (this.canvas_obj === null) {
            throw new Error("Canvas not initialized");
        }
        const mousePos = this.getMousePosition(event_obj);
        this.testFunction('Mouse down position: ' + mousePos.x + ',' + mousePos.y);
    },
    testFunction(message) {
        const context = this.getContext();
        context.clearRect(0, 0, this.canvas_obj.width, this.canvas_obj.height);
        context.font = '18pt Calibri';
        context.fillStyle = 'black';
        context.fillText(message, this.canvas_obj.width / 2, this.canvas_obj.height / 2);
    }
}