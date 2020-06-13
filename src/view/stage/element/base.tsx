import { ReductNode } from '@/semantics';
import cx from 'classnames';
import React, { Component } from 'react';
import { getElementForNode } from '.';

interface StageElementProps { 
  /**
   * The node to display here.
   */
  node: ReductNode | null;

  /**
   * If true, this node will display an empty slot when `node` is null.
   */
  slot?: boolean;
}

interface StageElementState {
  hover: boolean;
}

export default class StageElement extends Component<StageElementProps, StageElementState> {
  public constructor(props: StageElementProps) {
    super(props);
    this.setState({ hover: false });
  }

  /**
   * When the user begins to drag this element. Should only be called when this
   * element is not functioning as a slot.
   * @param event The `dragstart` event object.
   */
  private onDragStart(event: React.DragEvent<HTMLDivElement>) {
    if (!this.props.node) return;

    event.dataTransfer.setData('application/reduct-node', this.props.node.id.toString());
    event.dataTransfer.dropEffect = 'move';
  }

  /**
   * When something is dragged over this element. Should only be called when
   * this element is functioning as a slot.
   * @param event The `dragover` event object.
   */
  private onDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (this.props.node) return;

    const nodeId = parseInt(event.dataTransfer.getData('application/reduct-node'));
    if (!nodeId || isNaN(nodeId)) return;

    event.preventDefault();

    // TODO: add validation on whether the node being dragged can be dropped in
    // this slot
    this.setState({ hover: true });
  }
  
  public render() {
    const component = getElementForNode(this.props.node);

    if (!component) {
      if (this.props.slot === true) {
        return (
          <div className='stage-slot' onDragOver={this.onDragOver.bind(this)}></div>
        );
      } else {
        return null;
      }
    }

    return (
      <div className={cx('stage-element', { hover: this.state.hover })}
        draggable='true' 
        onDragStart={this.onDragStart.bind(this)}
      >
        {component}
      </div>
    )
  }
}
