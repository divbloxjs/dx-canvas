if (typeof window.DivbloxCanvas === undefined) {
    throw new Error("DivbloxCanvas is not loaded");
}
class MyCustomCanvas extends DivbloxCanvas {
    initObjectFromJson(json_obj = {}, must_handle_error_bool = true) {
        let return_obj = super.initObjectFromJson(json_obj, false);
        if (return_obj === null) {
            switch(json_obj["type"]) {
                case 'MyCustomCanvasObject': return_obj = new MyCustomCanvasObject({x:json_obj.x,y:json_obj.y},json_obj["additional_options"]);
                    break;
                default:
                    console.error("Invalid object type '"+json_obj["type"]+"' provided");
            }
        }
        return return_obj;
    }
}
class MyCustomCanvasObject extends DivbloxBaseCanvasObject {

}