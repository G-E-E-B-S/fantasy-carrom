const {ccclass, property} = cc._decorator;

@ccclass
export default class LoadingScreen extends cc.Component {

    @property(cc.Node)
    spinner: cc.Node = null;

    @property(cc.Label)
    labelText: cc.Label = null;

    start() {
        LoadingScreen._instance = this;
        LoadingScreen.show();
    }

    onDestroy() {
        LoadingScreen._instance = null;
    }

    static show(showSpinner: boolean = true, text = "Loading...") {
        this._instance.node.active = true;
        this._instance.spinner.active = showSpinner;

        this._instance.labelText.string = text;
    }

    static hide() {
        this._instance.node.active = false;
        this._instance.spinner.active = false;

        this._instance.labelText.string = "";
    }

    private static _instance: LoadingScreen;
}
