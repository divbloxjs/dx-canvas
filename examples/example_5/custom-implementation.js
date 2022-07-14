if (typeof window.DivbloxCanvas === undefined) {
    throw new Error("DivbloxCanvas is not loaded");
}

const CanvasConstant = {
    ClickableOrganisationCanvasObjectType: "clickable_organisation",
    EventCanvasObjectType: "event"
}

class MyCustomCanvas extends DivbloxCanvas {
    initObjectFromJson(json = {}, mustHandleError = true) {
        let objectToReturn = super.initObjectFromJson(json,false);
        const canvasId = Object.keys(this.objectList).length;
        if (objectToReturn === null) {
            switch(json["type"]) {
                case 'CustomCircleObject': objectToReturn = new CustomCircleObject(this,{x:json.x,y:json.y},json["additionalOptions"],json["data"],canvasId);
                    break;
                default:
                    console.error("Invalid object type '"+json["type"]+"' provided");
            }
        }
        return objectToReturn;
    }

    getCurrentMouseCoordinates(event) {
        if (event === undefined || event === null) return null;
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

    updateCanvasFromJsonArray(jsonArray = []) {
        this.objectList = {};
        this.objectUidMap = {};
        this.objectOrderedArray = [];

        for (const object of jsonArray) {
            this.registerObject(this.initObjectFromJson(object));
        }

        window.requestAnimationFrame(this.update.bind(this));
        return true;
    }
}

class CustomCircleObject extends DivbloxBaseCircleCanvasObject {
    onDoubleClick(dxCanvasObj) {
        super.drawRelatedTemporaryObjects(dxCanvasObj);
        const pageEvent = new CustomEvent('canvas_object_selected', {});
        dispatchEvent(pageEvent);
        // pageEventTriggered("canvas_object_selected");
    }

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
                    this.imageObj.src = this.additionalOptions["image"];
                    this.imageObj.setAttribute('crossorigin', 'anonymous');
                }
            } else {
                context.save();
                context.drawImage(this.imageObj, imgCoords.x, imgCoords.y, width / 2, height / 2);
                context.restore();
            }
        }

        if (typeof this.additionalOptions["text"] !== "undefined") {
            const height = this.boundingRectangleCoords.y2 - this.boundingRectangleCoords.y1;
            let fontSize = 25;
            if (typeof this.additionalOptions["fontSize"] !== "undefined") {
                fontSize = this.additionalOptions.fontSize;
            }
            context.font = fontSize + "px " + this.dxCanvas.baseFontFamily;
            let textCoords = {
                x: this.x,
                y: this.y + (height / 2) + fontSize
            };
            context.save();
            context.fillStyle = '#000';
            if (typeof this.additionalOptions["textColour"] !== "undefined") {
                context.fillStyle = this.additionalOptions["textColour"];
            }
            context.textAlign = 'center';

            let lines = this.additionalOptions["text"].split("{new_line}");
            let line = "";
            for (const line of lines) {
                context.fillText(line, textCoords.x, textCoords.y);
                textCoords.y += 25;
            }
            context.fillText(line, textCoords.x, textCoords.y);
            context.restore();
        }
    }

    drawNotificationBubble(context = null) {
        if (context === null) {
            throw new Error("No context provided for object");
        }
        // If we have notifications count higher than 0, let's draw the notification bubble
        if (((typeof this.additionalOptions["notificationCount"] !== "undefined") && (this.additionalOptions["notificationCount"] > 0)) ||
            ((typeof this.additionalOptions["collapsed"] !== "undefined"))) {
            // Let's draw the notification counter and its containing bubble
            context.save();

            let counterText;
            if ((typeof this.additionalOptions["collapsed"] !== "undefined")) {
                if (this.additionalOptions["collapsed"]) {
                    counterText = "+";
                } else {
                    counterText = "-";
                }
            } else {
                counterText = this.additionalOptions["notificationCount"];
            }

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
            context.fillStyle = '#000';
            context.textAlign = 'center';
            context.fillText(counterText, textCoords.x, textCoords.y);

            context.restore();
        }
    }
}