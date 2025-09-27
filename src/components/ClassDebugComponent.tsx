import React from 'react';

export class ClassDebugComponent extends React.Component {
  constructor(props: any) {
    super(props);
    console.log('[ClassDebugComponent] Constructor called');
  }
  
  componentDidMount() {
    console.log('[ClassDebugComponent] componentDidMount called!');
  }
  
  componentWillUnmount() {
    console.log('[ClassDebugComponent] componentWillUnmount called');
  }
  
  render() {
    console.log('[ClassDebugComponent] Render called');
    return (
      <div style={{ padding: '10px', border: '2px solid blue', background: 'lightblue' }}>
        <h3>Class Debug Component</h3>
        <p>If componentDidMount doesn't log, React lifecycle is broken!</p>
      </div>
    );
  }
}