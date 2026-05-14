// CodeMirror mode for ss/iproute2 output with syntax highlighting
(function(CodeMirror) {
  CodeMirror.defineMode("ss", function() {
    return {
      token(stream) {
        // Timestamp lines
        if (stream.sol() && stream.match(/^---\s*\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}.*---$/)) return "header";
        if (stream.sol() && stream.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) return "header";

        // Socket states
        if (stream.match(/\b(ESTAB|ESTABLISHED)\b/)) return "keyword";
        if (stream.match(/\b(LISTEN|UNCONN)\b/)) return "atom";
        if (stream.match(/\b(CLOSE-WAIT|TIME-WAIT|FIN-WAIT-1|FIN-WAIT-2|SYN-SENT|SYN-RECV|CLOSING|LAST-ACK)\b/)) return "error";

        // Metrics - latency
        if (stream.match(/\brtt:\d+(\.\d+)?\/\d+(\.\d+)?/)) return "number";
        if (stream.match(/\brto:\d+/)) return "number";
        if (stream.match(/\bato:\d+/)) return "number";
        if (stream.match(/\bcwnd:\d+/)) return "variable-2";
        if (stream.match(/\bssthresh:\d+/)) return "variable-2";
        if (stream.match(/\bbackoff:\d+/)) return "error";
        if (stream.match(/\bretrans:\d+\/\d+/)) return "error";

        // Socket memory
        if (stream.match(/skmem:\([^)]*\)/)) return "string";

        // Process info
        if (stream.match(/users:\(\("[^"]*",pid=\d+,fd=\d+\)\)/)) return "variable-3";

        // Timer
        if (stream.match(/timer:\([^)]*\)/)) return "comment";

        // Bandwidth/rates
        if (stream.match(/\b(send|pacing_rate|delivery_rate)\s+\d+(\.\d+)?[kmg]?bps/i)) return "variable-2";
        if (stream.match(/\d+(\.\d+)?[kmg]bps/i)) return "variable-2";

        // IP:port endpoints
        if (stream.match(/\[?[\da-fA-F.:]+\]?:\d+/)) return "link";

        stream.next();
        return null;
      }
    };
  });
  CodeMirror.defineMIME("text/x-ss", "ss");
})(window.CodeMirror);
