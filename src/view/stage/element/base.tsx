import { ReductNode, NodeId } from '@/semantics';
import cx from 'classnames';
import React, { Component } from 'react';
import { getElementForNode } from '.';
import { connect } from 'react-redux';
import { RState } from '@/reducer/state';

/**
 * Props retrieved from Redux.
 */
interface StageElementStoreProps { 
  /**
   * The node to display here.
   */
  node: ReductNode | null;
}

/**
 * Props provided directly.
 */
interface StageElementOwnProps { 
  /**
   * The ID of the node to display in this element.
   */
  nodeId: NodeId | null;

  /**
   * If true, this node will display an empty slot when `node` is null.
   */
  slot?: boolean;
}

type StageElementProps = StageElementOwnProps & StageElementStoreProps;

interface StageElementState {
  hover: boolean;
}

class StageElement extends Component<StageElementProps, StageElementState> {
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
    if (!this.props.nodeId) return;

    event.dataTransfer.setData('application/reduct-node', this.props.nodeId.toString());
    event.dataTransfer.dropEffect = 'move';
  }

  /**
   * When something is dragged over this element. Should only be called when
   * this element is functioning as a slot.
   * @param event The `dragover` event object.
   */
  private onDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (this.props.nodeId) return;

    const nodeId = parseInt(event.dataTransfer.getData('application/reduct-node'));
    if (!nodeId || isNaN(nodeId)) return;

    event.preventDefault();

    // TODO: add validation on whether the node being dragged can be dropped in
    // this slot
    this.setState({ hover: true });
  }

  /**
   * When something is dropped on this element. Should only be called when this
   * element is functioning as a slot.
   * @param event The `drop` event object.
   */
  private onDrop(event: React.DragEvent<HTMLDivElement>) {
    if (this.props.nodeId) return;

    const nodeId = parseInt(event.dataTransfer.getData('application/reduct-node'));
    if (!nodeId || isNaN(nodeId)) return;

    event.preventDefault();

    // TODO: add validation on whether the node being dragged can be dropped in
    // this slot
    this.setState({ hover: false });
  }
  
  public render() {
    const component = getElementForNode(this.props.node);

    if (!component) {
      if (this.props.slot === true) {
        return (
          <div className='stage-slot' 
            onDragOver={this.onDragOver.bind(this)}
            onDrop={this.onDrop.bind(this)}
          >
          </div>
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

export default connect((state: RState, ownProps: StageElementOwnProps) => {
  if (ownProps.nodeId) {
    const node = state.nodes.get(ownProps.nodeId);
    return { node: node ? node.toJS() : null };
  }
  return { node: null };
})(StageElement);
