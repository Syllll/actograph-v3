import { Application, Assets, Container, Sprite } from 'pixi.js';
import { xAxis } from './axis/x-axis';
import { IObservation, IReading } from '@services/observations/interface';
import { yAxis } from './axis/y-axis';
import { DataArea } from './data-area';

export class PixiApp {
  private app: Application;
  private plot!: Container;
  private xAxis!: xAxis;
  private yAxis!: yAxis;
  private dataArea!: DataArea;

  constructor() {
    // Create a new application
    this.app = new Application();
  }

  async init(options: { view: HTMLCanvasElement }) {
    console.log('options.view', options.view);

    await this.app.init({
      //width: 800,
      //height: 600,
      background: 'white',
      view: options.view,
      resizeTo: options.view,
    });

    this.yAxis = new yAxis(this.app);
    this.xAxis = new xAxis(this.app, this.yAxis);
    this.dataArea = new DataArea(this.app, this.yAxis, this.xAxis);

    // Create and add a container to the stage
    this.plot = new Container();
    this.plot.addChild(this.xAxis);
    this.plot.addChild(this.yAxis);
    this.plot.addChild(this.dataArea);

    this.app.stage.addChild(this.plot);

    this.yAxis.init();
    this.xAxis.init();
    this.dataArea.init();
  }

  public setData(observation: IObservation) {
    // Observation must have readings and protocol
    if (!observation.readings) {
      throw new Error('Observation must have readings');
    }
    if (!observation.protocol) {
      throw new Error('Observation must have protocol');
    }

    this.yAxis.setData(observation);
    this.xAxis.setData(observation);
    this.dataArea.setData(observation);

    // Ensure canvas is tall enough for all observables
    const requiredHeight = this.yAxis.getRequiredHeight();
    if (this.app.canvas && requiredHeight > this.app.canvas.height) {
      this.app.canvas.style.height = `${requiredHeight}px;`;
      this.app.canvas.height = requiredHeight;
    }
  }

  public async draw() {
    this.yAxis.draw();
    this.xAxis.draw();
    this.dataArea.draw();
  }

  public async clear() {

    this.yAxis.clear();
    this.xAxis.clear();
    this.dataArea.clear();
  }

  public destroy() {
    this.app.destroy();
  }
}
