import { ReductNode, NodeId } from '@/semantics';
import cx from 'classnames';
import React, { Component, FunctionComponent, useState } from 'react';
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

function onDragStart(
  event: React.DragEvent<HTMLDivElement>,
  props: StageElementProps
) {
  if (!props.nodeId) return;

  event.dataTransfer.setData('application/reduct-node', props.nodeId.toString());
  event.dataTransfer.dropEffect = 'move';
};

export const StageElementImpl: FunctionComponent<StageElementProps> = 
  (props) => {
    if (!props.node) {
      return null;
    }

    const component = getElementForNode(props.node);

    // top level nodes (nodes w/o parents) should not be considered locked
    // TODO: don't mark top level nodes as locked
    const locked = props.node.parent ? props.node.locked : false;

    const draggable = 
      // can't drag slots
      props.node.type !== 'missing' 
      // can't drag locked nodes
      && !locked;

    return (
      <div className={cx('element wrapper', { locked })}
        draggable={draggable} 
        onDragStart={e => onDragStart(e, props)}
      >
        {component}
      </div>
    );
  };

export const StageElement = connect(
  (
    state: Im<GlobalState>, 
    ownProps: StageElementOwnProps
  ) => {
    if (ownProps.nodeId) {
      const node = state.get('program')
        .get('$present')
        .get('nodes')
        .get(ownProps.nodeId);
      return { node: node ? node.toJS() : null };
    }
    return { node: null };
  }
)(StageElementImpl);
