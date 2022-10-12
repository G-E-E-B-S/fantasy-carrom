const {ccclass, property} = cc._decorator;

@ccclass
export default class GameOverPopup extends cc.Component {

    @property(cc.Sprite)
    sprite: cc.Sprite = null;

    @property(cc.Label)
    label: cc.Label = null;

    @property(cc.SpriteFrame)
    king: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    pirate: cc.SpriteFrame = null;

    @property(cc.Label)
    scoreLabel: cc.Label = null;

    init(win: boolean, tie: boolean, score: number){

        this.scoreLabel.string = score.toString();

        if (tie) {
            this.sprite.spriteFrame = this.king;
            this.label.string = "GAME TIED";
        } else if (win) {
            this.sprite.spriteFrame = this.king;
            this.label.string = "YOU WON";
        } else {
            this.sprite.spriteFrame = this.pirate;
            this.label.string = "YOU LOSE";
        }  
    }

    onRestart(_event) {
        cc.director.loadScene(cc.director.getScene().name);
    }
}
