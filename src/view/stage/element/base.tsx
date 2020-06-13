import { ReductNode, NodeId } from '@/semantics';
import cx from 'classnames';
import React, { Component } from 'react';
import { getElementForNode } from '.';
import { connect } from 'react-redux';
import { GlobalState } from '@/reducer/state';
import { Im } from '@/util/im';

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
}

type StageElementProps = StageElementOwnProps & StageElementStoreProps;


class StageElement extends Component<StageElementProps> {
  public constructor(props: StageElementProps) {
    super(props);
    this.state = { hover: false };
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
  
  public render() {
    if (!this.props.node) {
      return null;
    }

    const component = getElementForNode(this.props.node);

    // top level nodes (nodes w/o parents) should not be considered locked
    // TODO: don't mark top level nodes as locked
    const locked = this.props.node.parent ? this.props.node.locked : false;

    const draggable = 
      // can't drag slots
      this.props.node.type !== 'missing' 
      // can't drag locked nodes
      && !locked;

    return (
      <div className={cx('element wrapper', { locked })}
        draggable={draggable} 
        onDragStart={this.onDragStart.bind(this)}
      >
        {component}
      </div>
    )
  }
}

export default connect((state: Im<GlobalState>, ownProps: StageElementOwnProps) => {
  if (ownProps.nodeId) {
    const node = state.get('program').get('$present').get('nodes').get(ownProps.nodeId);
    return { node: node ? node.toJS() : null };
  }
  return { node: null };
})(StageElement);
