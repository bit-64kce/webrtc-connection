export function dtx(sdpoffer) {
  const modifiedSDP = sdpoffer.replace(
    /(a=fmtp:111 .*)/,
    '$1;usedtx=1'
  );

  return modifiedSDP
}
