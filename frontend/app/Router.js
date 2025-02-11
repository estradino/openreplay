import React, { lazy, Suspense } from 'react';
import { Switch, Route, Redirect } from 'react-router';
import { BrowserRouter, withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { Notification } from 'UI';
import { Loader } from 'UI';
import { fetchUserInfo } from 'Duck/user';
import withSiteIdUpdater from 'HOCs/withSiteIdUpdater';
const Login = lazy(() => import('Components/Login/Login'));
const ForgotPassword = lazy(() => import('Components/ForgotPassword/ForgotPassword'));
const UpdatePassword = lazy(() => import('Components/UpdatePassword/UpdatePassword'));
const SessionPure = lazy(() => import('Components/Session/Session'));
const LiveSessionPure = lazy(() => import('Components/Session/LiveSession'));
const OnboardingPure = lazy(() => import('Components/Onboarding/Onboarding'));
const ClientPure = lazy(() => import('Components/Client/Client'));
const AssistPure = lazy(() => import('Components/Assist'));
const BugFinderPure = lazy(() => import('Components/BugFinder/BugFinder'));
const DashboardPure = lazy(() => import('Components/Dashboard/NewDashboard'));
const ErrorsPure = lazy(() => import('Components/Errors/Errors'));
const FunnelDetails = lazy(() => import('Components/Funnels/FunnelDetails'));
const FunnelIssueDetails = lazy(() => import('Components/Funnels/FunnelIssueDetails'));
import WidgetViewPure from 'Components/Dashboard/components/WidgetView';
import Header from 'Components/Header/Header';
// import ResultsModal from 'Shared/Results/ResultsModal';
import { fetchList as fetchMetadata } from 'Duck/customField';
import { fetchList as fetchSiteList } from 'Duck/site';
import { fetchList as fetchAnnouncements } from 'Duck/announcements';
import { fetchList as fetchAlerts } from 'Duck/alerts';
import { fetchWatchdogStatus } from 'Duck/watchdogs';
import { dashboardService } from "App/services";
import { withStore } from 'App/mstore'

import APIClient from './api_client';
import * as routes from './routes';
import { OB_DEFAULT_TAB } from 'App/routes';
import Signup from './components/Signup/Signup';
import { fetchTenants } from 'Duck/user';
import { setSessionPath } from 'Duck/sessions';
import { ModalProvider } from './components/Modal';
import ModalRoot from './components/Modal/ModalRoot';

const BugFinder = withSiteIdUpdater(BugFinderPure);
const Dashboard = withSiteIdUpdater(DashboardPure);
const WidgetView = withSiteIdUpdater(WidgetViewPure);
const Session = withSiteIdUpdater(SessionPure);
const LiveSession = withSiteIdUpdater(LiveSessionPure);
const Assist = withSiteIdUpdater(AssistPure);
const Client = withSiteIdUpdater(ClientPure);
const Onboarding = withSiteIdUpdater(OnboardingPure);
const Errors = withSiteIdUpdater(ErrorsPure);
const Funnels = withSiteIdUpdater(FunnelDetails);
const FunnelIssue = withSiteIdUpdater(FunnelIssueDetails);
const withSiteId = routes.withSiteId;
const withObTab = routes.withObTab;

const METRICS_PATH = routes.metrics();
const METRICS_DETAILS = routes.metricDetails();

const DASHBOARD_PATH = routes.dashboard();
const DASHBOARD_SELECT_PATH = routes.dashboardSelected();
const DASHBOARD_METRIC_CREATE_PATH = routes.dashboardMetricCreate();
const DASHBOARD_METRIC_DETAILS_PATH = routes.dashboardMetricDetails();

// const WIDGET_PATAH = routes.dashboardMetric();
const SESSIONS_PATH = routes.sessions();
const ASSIST_PATH = routes.assist();
const ERRORS_PATH = routes.errors();
const ERROR_PATH = routes.error();
const FUNNEL_PATH = routes.funnel();
const FUNNEL_ISSUE_PATH = routes.funnelIssue();
const SESSION_PATH = routes.session();
const LIVE_SESSION_PATH = routes.liveSession();
const LOGIN_PATH = routes.login();
const SIGNUP_PATH = routes.signup();
const FORGOT_PASSWORD = routes.forgotPassword();
const CLIENT_PATH = routes.client();
const ONBOARDING_PATH = routes.onboarding();
const ONBOARDING_REDIRECT_PATH = routes.onboarding(OB_DEFAULT_TAB);

@withStore
@withRouter
@connect((state) => {
  const siteId = state.getIn([ 'site', 'siteId' ]);
  const jwt = state.get('jwt');
  const changePassword = state.getIn([ 'user', 'account', 'changePassword' ]);
  const userInfoLoading = state.getIn([ 'user', 'fetchUserInfoRequest', 'loading' ]);
  return {
    jwt,
    siteId,
    changePassword,
    sites: state.getIn([ 'site', 'list' ]),
    isLoggedIn: jwt !== null && !changePassword,
    loading: siteId === null || userInfoLoading,
    email: state.getIn([ 'user', 'account', 'email' ]),
    account: state.getIn([ 'user', 'account' ]),
    organisation: state.getIn([ 'user', 'client', 'name' ]),
    tenantId: state.getIn([ 'user', 'client', 'tenantId' ]),
    tenants: state.getIn(['user', 'tenants']),
    existingTenant: state.getIn(['user', 'authDetails', 'tenants']),
    onboarding: state.getIn([ 'user', 'onboarding' ])
  };
}, {
  fetchUserInfo,
  fetchTenants,
  setSessionPath,
  fetchMetadata,
  fetchSiteList,
  fetchAnnouncements,
  fetchAlerts,
  fetchWatchdogStatus,
})
class Router extends React.Component {
  state = {
    destinationPath: null
  }
  constructor(props) {
    super(props);
    if (props.isLoggedIn) {
      this.fetchInitialData();
    }
    props.fetchTenants();
  }

  fetchInitialData = () => {
    Promise.all([
      this.props.fetchUserInfo().then(() => {
        this.props.fetchSiteList().then(() => {
          const { mstore } = this.props
          mstore.initClient();

          setTimeout(() => {
            this.props.fetchMetadata() 
            this.props.fetchAnnouncements();
            this.props.fetchAlerts();
            this.props.fetchWatchdogStatus();
          }, 100);
        })
      })
    ])
  }

  componentDidMount() {
    const { isLoggedIn, location } = this.props;
    if (!isLoggedIn) {
      this.setState({ destinationPath: location.pathname });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    this.props.setSessionPath(prevProps.location.pathname)
    if (prevProps.email !== this.props.email && !this.props.email) {
      this.props.fetchTenants();
    }

    if (this.state.destinationPath && !prevProps.isLoggedIn && this.props.isLoggedIn && this.state.destinationPath !== routes.login() && this.state.destinationPath !== '/') {
      this.props.history.push(this.state.destinationPath);
      this.setState({ destinationPath: null });
    }

    if (!prevProps.isLoggedIn && this.props.isLoggedIn) {
      this.fetchInitialData();
    }
  }

  render() {    
    const { isLoggedIn, jwt, siteId, sites, loading, changePassword, location, existingTenant, onboarding } = this.props;
    const siteIdList = sites.map(({ id }) => id).toJS();
    const hideHeader = location.pathname && location.pathname.includes('/session/') || location.pathname.includes('/assist/');

    return isLoggedIn ?
      <Loader loading={ loading } className="flex-1" >
        {!hideHeader && <Header key="header"/>}
        <Notification />
        
        <Suspense fallback={<Loader loading={true} className="flex-1" />}>
          <ModalProvider>
            <ModalRoot />
          <Switch key="content" >
            <Route path={ CLIENT_PATH } component={ Client } />
            <Route path={ withSiteId(ONBOARDING_PATH, siteIdList)} component={ Onboarding } />
            <Route
              path="/integrations/"
              render={
              ({ location }) => {
                const client = new APIClient(jwt);
                switch (location.pathname) {
                  case '/integrations/slack':
                    client.post('integrations/slack/add', { 
                      code: location.search.split('=')[ 1 ],
                      state: tenantId,
                    });
                    break;
                }
                return <Redirect to={ CLIENT_PATH } />;
              }
            }
            />
            { onboarding && 
              <Redirect to={ withSiteId(ONBOARDING_REDIRECT_PATH, siteId)} />
            }
            {/* { siteIdList.length === 0 && 
              <Redirect to={ routes.client(routes.CLIENT_TABS.SITES) } />
            } */}
            
            {/* DASHBOARD and Metrics */}
            <Route exact strict path={ withSiteId(METRICS_PATH, siteIdList) } component={ Dashboard } />
            <Route exact strict path={ withSiteId(METRICS_DETAILS, siteIdList) } component={ Dashboard } />
            <Route exact strict path={ withSiteId(DASHBOARD_PATH, siteIdList) } component={ Dashboard } />
            <Route exact strict path={ withSiteId(DASHBOARD_SELECT_PATH, siteIdList) } component={ Dashboard } />
            <Route exact strict path={ withSiteId(DASHBOARD_METRIC_CREATE_PATH, siteIdList) } component={ Dashboard } />
            <Route exact strict path={ withSiteId(DASHBOARD_METRIC_DETAILS_PATH, siteIdList) } component={ Dashboard } />

            <Route exact strict path={ withSiteId(ASSIST_PATH, siteIdList) } component={ Assist } />
            <Route exact strict path={ withSiteId(ERRORS_PATH, siteIdList) } component={ Errors } />
            <Route exact strict path={ withSiteId(ERROR_PATH, siteIdList) } component={ Errors } />
            <Route exact strict path={ withSiteId(FUNNEL_PATH, siteIdList) } component={ Funnels } />
            <Route exact strict path={ withSiteId(FUNNEL_ISSUE_PATH, siteIdList) } component={ FunnelIssue } />
            <Route exact strict path={ withSiteId(SESSIONS_PATH, siteIdList) } component={ BugFinder } />
            <Route exact strict path={ withSiteId(SESSION_PATH, siteIdList) } component={ Session } />
            <Route exact strict path={ withSiteId(LIVE_SESSION_PATH, siteIdList) } component={ LiveSession } />
            <Route exact strict path={ withSiteId(LIVE_SESSION_PATH, siteIdList) } render={ (props) => <Session { ...props } live /> } />
            { routes.redirects.map(([ fr, to ]) => (
              <Redirect key={ fr } exact strict from={ fr } to={ to } />
            )) }
            <Redirect to={ withSiteId(SESSIONS_PATH, siteId) } />
          </Switch>
          </ModalProvider>
        </Suspense>
      </Loader>
       :
       <Suspense fallback={<Loader loading={true} className="flex-1" />}>
        <Switch>
          <Route exact strict path={ FORGOT_PASSWORD } component={ ForgotPassword } />
          <Route exact strict path={ LOGIN_PATH } component={ changePassword ? UpdatePassword : Login } />
          { !existingTenant && <Route exact strict path={ SIGNUP_PATH } component={ Signup } /> }
          <Redirect to={ LOGIN_PATH } />
        </Switch>
      </Suspense>;
  }
}

export default () => (
  <BrowserRouter>
    <Router />
  </BrowserRouter>
);
