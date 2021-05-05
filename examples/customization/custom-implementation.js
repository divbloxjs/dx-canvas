if (typeof window.DivbloxCanvas === undefined) {
    throw new Error("DivbloxCanvas is not loaded");
}
class MyCustomCanvas extends DivbloxCanvas {
    initObjectFromJson(json = {}, mustHandleError = true) {
        let objectToReturn = super.initObjectFromJson(json,false);
        const canvasId = Object.keys(this.objectList).length;
        if (objectToReturn === null) {
            switch(json["type"]) {
                case 'MyCustomCanvasObject': objectToReturn = new MyCustomCanvasObject(this,{x:json.x,y:json.y},json["additionalOptions"],json["data"],canvasId);
                    break;
                default:
                    console.error("Invalid object type '"+json["type"]+"' provided");
            }
        }
        return objectToReturn;
    }
}
class MyCustomCanvasObject extends DivbloxBaseCanvasObject {

}