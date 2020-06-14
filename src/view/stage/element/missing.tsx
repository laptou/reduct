import { fillHole } from '@/reducer/action';
import { NodeId, ReductNode } from '@/semantics';
import '@resources/style/react/element/op.scss';
import cx from 'classnames';
import React, { Component } from 'react';
import { connect } from 'react-redux';

interface MissingElementState {
  hover: boolean;
}

interface MissingElementOwnProps {
  node: ReductNode;
}

interface MissingElementDispatchProps {
  fill(id: NodeId): void;
}

type MissingElementProps = 
  MissingElementOwnProps & 
  MissingElementDispatchProps;
class MissingElementImpl extends Component<
  MissingElementProps, 
  MissingElementState
> {
  public constructor(props: MissingElementProps) {
    super(props);
    this.state = { hover: false };
  }

  /**
   * When something is dragged over this element.
   * @param event The `dragover` event object.
   */
  private onDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes('application/reduct-node')) return;
    event.preventDefault();

    // TODO: add validation on whether the node being dragged can be dropped in
    // this slot
    this.setState({ hover: true });
  }

  /**
   * When something is no longer being dragged over this element.
   * @param event The `dragleave` event object.
   */
  private onDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();

    // TODO: add validation on whether the node being dragged can be dropped in
    // this slot
    this.setState({ hover: false });
  }

  /**
   * When something is dropped on this element.
   * @param event The `drop` event object.
   */
  private onDrop(event: React.DragEvent<HTMLDivElement>) {
    const nodeId = parseInt(event.dataTransfer.getData('application/reduct-node'));
    if (!nodeId || isNaN(nodeId)) return;

    event.preventDefault();

    this.setState({ hover: false });

    // fill this slot with the node that was dropped on it
    this.props.fill(nodeId);
  }

  public render() {
    const { hover } = this.state;
    
    return (
      <div className={cx('element slot', { hover })}
        onDragOver={this.onDragOver.bind(this)}
        onDragLeave={this.onDragLeave.bind(this)}
        onDrop={this.onDrop.bind(this)}
      >
      </div>
    );
  }
}

export const MissingElement = connect(
  null, 
  (dispatch, ownProps: MissingElementOwnProps) => ({
    fill: (id: NodeId) => dispatch(fillHole(ownProps.node.id, id))
  })
)(MissingElementImpl);
