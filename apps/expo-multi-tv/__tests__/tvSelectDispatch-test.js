jest.mock('expo/config-plugins', () => ({
  withMainActivity: (config, action) => action(config),
}));
const withKeyEvent = require('../plugins/withKeyEvent');

it('generates TV-only Select consumption after forwarding both phases and before native dispatch', () => {
  const original = { modResults: { contents: 'package sample\nimport android.os.Bundle\nclass MainActivity : ReactActivity() {\n}\n' } };
  const result = withKeyEvent(original).modResults.contents;
  const start = result.indexOf('override fun dispatchKeyEvent');
  const end = result.indexOf('override fun onKeyDown', start);
  const dispatch = result.slice(start, end);
  expect(dispatch).toContain('KeyEvent.ACTION_DOWN -> KeyEventModule.getInstance().onKeyDownEvent');
  expect(dispatch).toContain('KeyEvent.ACTION_UP -> KeyEventModule.getInstance().onKeyUpEvent');
  expect(dispatch).toContain('Configuration.UI_MODE_TYPE_TELEVISION');
  expect(dispatch).toContain('KeyEvent.KEYCODE_DPAD_CENTER || event.keyCode == KeyEvent.KEYCODE_ENTER');
  expect(dispatch).toContain('isTelevision && isSelect && (event.action == KeyEvent.ACTION_DOWN || event.action == KeyEvent.ACTION_UP)');
  expect(dispatch.indexOf('return true')).toBeLessThan(dispatch.indexOf('return super.dispatchKeyEvent(event)'));
  // Regeneration replaces the generated block instead of duplicating native handlers.
  const twice = withKeyEvent({ modResults: { contents: result } }).modResults.contents;
  expect((twice.match(/override fun dispatchKeyEvent/g) || [])).toHaveLength(1);
});
