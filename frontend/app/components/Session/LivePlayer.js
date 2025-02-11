import { useEffect } from 'react';
import { connect } from 'react-redux';
import { Loader } from 'UI';
import { toggleFullscreen, closeBottomBlock } from 'Duck/components/player';
import { withRequest } from 'HOCs'
import {
  PlayerProvider,
  connectPlayer,
  init as initPlayer,
  clean as cleanPlayer,
} from 'Player';
import withPermissions from 'HOCs/withPermissions';

import PlayerBlockHeader from '../Session_/PlayerBlockHeader';
import PlayerBlock from '../Session_/PlayerBlock';
import styles from '../Session_/session.css';


const InitLoader = connectPlayer(state => ({ 
  loading: !state.initialized
}))(Loader);


function LivePlayer ({ session, toggleFullscreen, closeBottomBlock, fullscreen, jwt, loadingCredentials, assistCredendials, request, isEnterprise, hasErrors }) {
  useEffect(() => {
    if (!loadingCredentials) {
      initPlayer(session, jwt, assistCredendials, true);
    }
    return () => cleanPlayer()
  }, [ session.sessionId, loadingCredentials, assistCredendials ]);

  // LAYOUT (TODO: local layout state - useContext or something..)
  useEffect(() => {
    if (isEnterprise) {
      request();
    }
    return () => {
      toggleFullscreen(false);
      closeBottomBlock();
    }
  }, [])

  return (
    <PlayerProvider>
      <InitLoader className="flex-1 p-3">
        <PlayerBlockHeader fullscreen={fullscreen} />
        <div className={ styles.session } data-fullscreen={fullscreen}>
          <PlayerBlock />
        </div>
      </InitLoader>
    </PlayerProvider>
  );
};

export default withRequest({
  initialData: null,
	endpoint: '/assist/credentials',
	dataWrapper: data => data,
	dataName: 'assistCredendials',
  loadingName: 'loadingCredentials',
})(withPermissions(['ASSIST_LIVE'], '', true)(connect(
  state => {
    return {
      session: state.getIn([ 'sessions', 'current' ]),
      showAssist: state.getIn([ 'sessions', 'showChatWindow' ]),
      jwt: state.get('jwt'),
      fullscreen: state.getIn([ 'components', 'player', 'fullscreen' ]),
      isEnterprise: state.getIn([ 'user', 'client', 'edition' ]) === 'ee',
      hasErrors: !!state.getIn([ 'sessions', 'errors' ]),
    }
  },
  { toggleFullscreen, closeBottomBlock },
)(LivePlayer)));
