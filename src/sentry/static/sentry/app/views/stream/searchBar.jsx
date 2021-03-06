import PropTypes from 'prop-types';
import React from 'react';

import {SEARCH_TYPES} from 'app/constants';
import {fetchRecentSearches} from 'app/actionCreators/savedSearches';
import {t} from 'app/locale';
import SentryTypes from 'app/sentryTypes';
import SmartSearchBar from 'app/components/smartSearchBar';
import withApi from 'app/utils/withApi';
import withOrganization from 'app/utils/withOrganization';

const SEARCH_ITEMS = [
  {
    title: t('Tag'),
    desc: 'browser:"Chrome 34", has:browser',
    value: 'browser:',
    type: 'default',
  },
  {
    title: t('Status'),
    desc: 'is:resolved, unresolved, ignored, assigned, unassigned',
    value: 'is:',
    type: 'default',
  },
  {
    title: t('Time or Count'),
    desc: 'firstSeen, lastSeen, event.timestamp, timesSeen',
    value: '',
    type: 'default',
  },
  {
    title: t('Assigned'),
    desc: 'assigned:[me|user@example.com]',
    value: 'assigned:',
    type: 'default',
  },
  {
    title: t('Bookmarked By'),
    desc: 'bookmarks:[me|user@example.com]',
    value: 'bookmarks:',
    type: 'default',
  },
];

class SearchBar extends React.Component {
  static propTypes = {
    ...SmartSearchBar.propTypes,

    savedSearch: SentryTypes.SavedSearch,
    organization: SentryTypes.Organization.isRequired,
    tagValueLoader: PropTypes.func.isRequired,
    onSidebarToggle: PropTypes.func,
  };

  state = {
    defaultSearchItems: [SEARCH_ITEMS, []],
    recentSearches: [],
  };

  componentDidMount() {
    // Ideally, we would fetch on demand (e.g. when input gets focus)
    // but `<SmartSearchBar>` is a bit complicated and this is the easiest route
    this.fetchData();
  }

  hasRecentSearches = () => {
    const {organization} = this.props;
    return organization && organization.features.includes('recent-searches');
  };

  hasOrgSavedSearches = () => {
    const {organization} = this.props;
    return organization && organization.features.includes('org-saved-searches');
  };

  fetchData = async () => {
    if (!this.hasRecentSearches()) {
      this.setState({
        defaultSearchItems: [SEARCH_ITEMS, []],
      });

      return;
    }

    const resp = await this.getRecentSearches();

    this.setState({
      defaultSearchItems: [
        SEARCH_ITEMS,
        resp
          ? resp.map(query => ({
              desc: query,
              value: query,
              className: 'icon-clock',
              type: 'recent-search',
            }))
          : [],
      ],
      recentSearches: resp,
    });
  };

  /**
   * Returns array of tag values that substring match `query`; invokes `callback`
   * with data when ready
   */
  getTagValues = (tag, query) => {
    const {tagValueLoader} = this.props;

    return tagValueLoader(tag.key, query).then(
      values => values.map(({value}) => value),
      () => {
        throw new Error('Unable to fetch project tags');
      }
    );
  };

  getRecentSearches = async fullQuery => {
    const {api, orgId} = this.props;
    const recent = await fetchRecentSearches(api, orgId, SEARCH_TYPES.ISSUE, fullQuery);
    return (recent && recent.map(({query}) => query)) || [];
  };

  handleSavedRecentSearch = () => {
    // No need to refetch if recent searches feature is not enabled
    if (!this.hasRecentSearches()) {
      return;
    }

    // Reset recent searches
    this.fetchData();
  };

  render() {
    const {
      tagValueLoader, // eslint-disable-line no-unused-vars
      savedSearch,
      onSidebarToggle,
      ...props
    } = this.props;
    const hasPinnedSearch = this.hasOrgSavedSearches();

    return (
      <React.Fragment>
        <SmartSearchBar
          onGetTagValues={this.getTagValues}
          defaultSearchItems={this.state.defaultSearchItems}
          maxSearchItems={5}
          hasPinnedSearch={hasPinnedSearch}
          savedSearchType={SEARCH_TYPES.ISSUE}
          displayRecentSearches={this.hasRecentSearches()}
          onSavedRecentSearch={this.handleSavedRecentSearch}
          onSidebarToggle={onSidebarToggle}
          pinnedSearch={savedSearch && savedSearch.isPinned ? savedSearch : null}
          {...props}
        />
        {!hasPinnedSearch && onSidebarToggle && (
          <a className="btn btn-default toggle-stream-sidebar" onClick={onSidebarToggle}>
            <span className="icon-filter" />
          </a>
        )}
      </React.Fragment>
    );
  }
}

export default withApi(withOrganization(SearchBar));
